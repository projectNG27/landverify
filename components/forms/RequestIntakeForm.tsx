"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { getIntakePaymentStatus, startIntakePaystackCheckout } from "@/app/actions/paystack-checkout";
import { submitRequestIntake } from "@/app/actions/request-intake";
import { RequestIntakeSuccess } from "@/components/forms/RequestIntakeSuccess";
import { STATE_LGAS, type SupportedState } from "@/lib/locations";
import { amountKoboForTier, formatNgnFromKobo } from "@/lib/pricing";
import { PRODUCTS } from "@/lib/products";
import {
  MAX_DOCUMENTS,
  MAX_FILE_BYTES,
  REQUEST_INTAKE_STATE_VALUES,
  parseCaptchaAnswerDigits,
  requestIntakeClientResolverSchema,
  resolveIntakeFileMime,
  type RequestIntakeFormValues,
} from "@/lib/validations/request-intake";

const inputClass =
  "w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2 disabled:opacity-60";

function parseCoordinatesValue(raw: string): { lat: number; lng: number } | null {
  const match = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

const LocationMapPicker = dynamic(
  () => import("@/components/forms/LocationMapPicker").then((m) => m.LocationMapPicker),
  { ssr: false },
);

function validateFiles(files: FileList | null): { ok: true; names: string[] } | { ok: false; message: string } {
  if (!files || files.length === 0) {
    return { ok: true, names: [] };
  }
  if (files.length > MAX_DOCUMENTS) {
    return { ok: false, message: `You can attach up to ${MAX_DOCUMENTS} files.` };
  }
  const names: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files.item(i);
    if (!f) continue;
    if (f.size > MAX_FILE_BYTES) {
      return { ok: false, message: `“${f.name}” is larger than 5 MB.` };
    }
    if (!resolveIntakeFileMime(f)) {
      return {
        ok: false,
        message: `“${f.name}” must be PDF, JPEG, PNG, or WebP.`,
      };
    }
    names.push(f.name);
  }
  return { ok: true, names };
}

const defaultValues: RequestIntakeFormValues = {
  full_name: "",
  email: "",
  phone: "",
  whatsapp_number: "",
  product_id: "",
  state: "",
  lga: "",
  land_location_description: "",
  google_maps_link: "",
  coordinates: "",
  seller_name: "",
  seller_phone: "",
  additional_notes: "",
  consent: false,
  document_names: undefined,
  captcha_answer: "",
  website: "",
};

type RequestIntakeFormProps = {
  captchaA: number;
  captchaB: number;
  formStartedAt: number;
  persistenceConfigured: boolean;
  paymentsConfigured: boolean;
  paystackTestMode: boolean;
};

export function RequestIntakeForm({
  captchaA,
  captchaB,
  formStartedAt,
  persistenceConfigured,
  paymentsConfigured,
  paystackTestMode,
}: RequestIntakeFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousStateRef = useRef<string>("");
  /** Monotonic time at first client mount — used for the “wait 3s” rule (no client/server clock skew). */
  const pageOpenPerfRef = useRef<number | null>(null);
  /** Client wall time at mount — sent to the server for a loose time check. */
  const pageOpenMsRef = useRef<number>(0);
  const [rootMessage, setRootMessage] = useState<string | null>(null);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [paymentServiceConsent, setPaymentServiceConsent] = useState(false);
  const [intakePayment, setIntakePayment] = useState<null | {
    reference: string;
    productId: string;
    emailHint: string;
    tierLabel: string;
    amountDisplay: string;
  }>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [paymentRefMessage, setPaymentRefMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState<null | { mode: "preview" | "live"; requestId?: string; email: string }>(null);
  const [stateChangedNotice, setStateChangedNotice] = useState(false);

  useEffect(() => {
    if (typeof performance !== "undefined" && pageOpenPerfRef.current === null) {
      pageOpenPerfRef.current = performance.now();
    }
    if (pageOpenMsRef.current === 0) {
      pageOpenMsRef.current = Date.now();
    }
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    setValue,
    watch,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RequestIntakeFormValues>({
    resolver: zodResolver(requestIntakeClientResolverSchema),
    defaultValues,
  });
  const selectedState = watch("state");
  const liveCoordinates = watch("coordinates");
  const liveDescription = watch("land_location_description");
  const selectedLga = watch("lga");
  const selectedProductId = watch("product_id");
  const quoteKobo = amountKoboForTier(selectedProductId);
  const parsedFromCoordinates = parseCoordinatesValue(liveCoordinates);
  const previewPoint = parsedFromCoordinates;
  const hasLocationSelected = Boolean(previewPoint);
  const selectedStateAsSupported = (
    REQUEST_INTAKE_STATE_VALUES.includes(selectedState as (typeof REQUEST_INTAKE_STATE_VALUES)[number])
      ? selectedState
      : ""
  ) as SupportedState | "";
  const availableLgas = selectedStateAsSupported ? STATE_LGAS[selectedStateAsSupported] : [];

  const paymentRefParam = searchParams.get("payment_ref");
  const payFirstLive = persistenceConfigured && paymentsConfigured;
  const submitBlocked = payFirstLive && !intakePayment;

  useEffect(() => {
    if (!payFirstLive) return;
    const ref = paymentRefParam?.trim();
    if (!ref) return;

    let cancelled = false;
    setPaymentRefMessage(null);
    void (async () => {
      const s = await getIntakePaymentStatus(ref);
      if (cancelled) return;
      if (s.ok) {
        setIntakePayment({
          reference: ref,
          productId: s.productId,
          emailHint: s.emailHint,
          tierLabel: s.tierLabel,
          amountDisplay: s.amountDisplay,
        });
        setValue("product_id", s.productId, { shouldValidate: true, shouldDirty: true });
        router.replace("/submit-request", { scroll: false });
      } else {
        setPaymentRefMessage(s.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [paymentRefParam, payFirstLive, router, setValue]);

  useEffect(() => {
    const previous = previousStateRef.current;
    if (previous && selectedState && previous !== selectedState && hasLocationSelected) {
      setStateChangedNotice(true);
    }
    previousStateRef.current = selectedState;
  }, [selectedState, hasLocationSelected]);

  useEffect(() => {
    if (!selectedStateAsSupported) {
      if (selectedLga) {
        setValue("lga", "", { shouldDirty: true, shouldValidate: false });
      }
      clearErrors("lga");
      return;
    }
    if (selectedLga && !STATE_LGAS[selectedStateAsSupported].includes(selectedLga as never)) {
      setValue("lga", "", { shouldDirty: true, shouldValidate: false });
      clearErrors("lga");
      return;
    }
    if (selectedLga) {
      clearErrors("lga");
    }
  }, [clearErrors, selectedStateAsSupported, selectedLga, setValue]);

  useEffect(() => {
    if (!success) return;
    window.requestAnimationFrame(() => {
      document.getElementById("intake-success-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [success]);

  function handleSubmitAnother() {
    setSuccess(null);
    setRootMessage(null);
    setPaymentServiceConsent(false);
    setIntakePayment(null);
    setPaymentRefMessage(null);
    reset(defaultValues);
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  function handleMapPick(point: { lat: number; lng: number }, displayAddress?: string) {
    const coordinatesText = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
    const mapsLink = `https://www.google.com/maps/search/?api=1&query=${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;

    setValue("coordinates", coordinatesText, { shouldDirty: true, shouldValidate: true });
    setValue("google_maps_link", mapsLink, { shouldDirty: true, shouldValidate: true });
    const currentDescription = liveDescription?.trim() ?? "";
    if (!currentDescription && displayAddress) {
      setValue("land_location_description", displayAddress, { shouldDirty: true, shouldValidate: true });
    }
    setStateChangedNotice(false);
    setMapMessage(
      displayAddress
        ? "Map point selected. Coordinates, map link, and location description updated."
        : "Map point selected. Coordinates and map link updated.",
    );
  }

  function resetPickedLocation() {
    setValue("coordinates", "", { shouldDirty: true, shouldValidate: true });
    setValue("google_maps_link", "", { shouldDirty: true, shouldValidate: true });
    setStateChangedNotice(false);
    setMapMessage("Location reset. Pick a point for the selected state.");
  }

  function onInvalid(errorsMap: FieldErrors<RequestIntakeFormValues>) {
    const firstErrorField = Object.keys(errorsMap)[0] as keyof RequestIntakeFormValues | undefined;
    if (!firstErrorField) return;
    const key = String(firstErrorField);
    setRootMessage(`Please check "${key.replaceAll("_", " ")}" and try again.`);
    const el = document.getElementById(key);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        el.focus();
      }
    }
  }

  async function handlePayWithPaystack() {
    setRootMessage(null);
    const fieldsOk = await trigger(["email", "product_id"]);
    if (!fieldsOk) {
      setRootMessage("Enter a valid email and choose your verification tier before paying.");
      return;
    }
    if (!paymentServiceConsent) {
      setRootMessage("Tick the payment agreement to continue with Paystack checkout.");
      return;
    }
    const v = getValues();
    const pid = v.product_id;
    if (pid !== "basic" && pid !== "standard" && pid !== "premium") {
      setRootMessage("Select Basic, Standard, or Premium before paying.");
      return;
    }
    setPayBusy(true);
    try {
      const res = await startIntakePaystackCheckout({
        email: v.email.trim(),
        product_id: pid,
        payment_service_consent: true,
      });
      if (!res.ok) {
        setRootMessage(res.message);
        return;
      }
      const url = res.authorization_url?.trim();
      if (!url) {
        setRootMessage("Paystack did not return a checkout link. Check Vercel logs and your Paystack dashboard.");
        return;
      }
      window.location.assign(url);
    } catch (e) {
      setRootMessage(
        e instanceof Error ? e.message : "Checkout failed unexpectedly. Open the browser console and try again.",
      );
    } finally {
      setPayBusy(false);
    }
  }

  async function onSubmit(values: RequestIntakeFormValues) {
    setRootMessage(null);
    setSuccess(null);
    clearErrors();

    const expectedSum = captchaA + captchaB;
    const captchaParsed = parseCaptchaAnswerDigits(values.captcha_answer);
    if (captchaParsed !== expectedSum) {
      setError("captcha_answer", { message: "Incorrect CAPTCHA answer" });
      return;
    }

    const openPerf = pageOpenPerfRef.current;
    if (openPerf != null && typeof performance !== "undefined" && performance.now() - openPerf < 2500) {
      setRootMessage("Please wait at least 3 seconds after the page loads before submitting.");
      return;
    }

    const fileCheck = validateFiles(fileInputRef.current?.files ?? null);
    if (!fileCheck.ok) {
      setRootMessage(fileCheck.message);
      return;
    }

    const fd = new FormData();
    fd.append("full_name", values.full_name);
    fd.append("email", values.email);
    fd.append("phone", values.phone);
    fd.append("whatsapp_number", values.whatsapp_number);
    fd.append("product_id", values.product_id);
    fd.append("state", values.state);
    fd.append("lga", values.lga);
    fd.append("land_location_description", values.land_location_description);
    fd.append("google_maps_link", values.google_maps_link);
    fd.append("coordinates", values.coordinates);
    fd.append("seller_name", values.seller_name);
    fd.append("seller_phone", values.seller_phone);
    fd.append("additional_notes", values.additional_notes);
    if (values.consent) fd.append("consent", "on");
    fd.append("captcha_answer", values.captcha_answer);
    fd.append("captcha_expected", String(expectedSum));
    fd.append("form_started_at", String(pageOpenMsRef.current > 0 ? pageOpenMsRef.current : formStartedAt));
    fd.append("website", values.website ?? "");

    if (payFirstLive && intakePayment?.reference) {
      fd.append("paystack_reference", intakePayment.reference);
    }

    const files = fileInputRef.current?.files;
    fd.append("intake_file_count", String(files?.length ?? 0));
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i);
        if (f) fd.append("documents", f);
      }
    }

    const result = await submitRequestIntake(fd);

    if (!result.ok) {
      if (result.message) setRootMessage(result.message);
      if (result.fieldErrors) {
        for (const [key, msgs] of Object.entries(result.fieldErrors)) {
          const msg = msgs?.[0];
          if (msg && key === "form_started_at") {
            setRootMessage(msg);
            continue;
          }
          if (msg) {
            setError(key as keyof RequestIntakeFormValues, { message: msg });
          }
        }
      }
      return;
    }

    const submittedEmail = values.email.trim();
    setIntakePayment(null);
    setPaymentServiceConsent(false);
    setSuccess({ mode: result.mode, requestId: result.request_id, email: submittedEmail });
    reset(defaultValues);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-8">
      {success ? (
        <RequestIntakeSuccess
          mode={success.mode}
          requestId={success.requestId}
          email={success.email}
          onSubmitAnother={handleSubmitAnother}
        />
      ) : null}

      {rootMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900" role="alert">
          {rootMessage}
        </div>
      ) : null}

      {paymentRefMessage ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-600/40 dark:bg-amber-950/35 dark:text-amber-100" role="status">
          {paymentRefMessage}
        </div>
      ) : null}

      {success ? null : (
      <form className="space-y-10" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        <fieldset className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-[var(--lv-ink)]">Your contact details</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="full_name" className="block text-sm font-medium text-[var(--lv-ink)]">
                Full name <span className="text-red-600">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                autoComplete="name"
                className={`${inputClass} mt-1.5`}
                aria-invalid={errors.full_name ? "true" : "false"}
                aria-describedby={errors.full_name ? "full_name-error" : undefined}
                {...register("full_name")}
              />
              {errors.full_name ? (
                <p id="full_name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.full_name.message}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--lv-ink)]">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                disabled={Boolean(intakePayment)}
                className={`${inputClass} mt-1.5`}
                aria-invalid={errors.email ? "true" : "false"}
                {...register("email")}
              />
              {errors.email ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[var(--lv-ink)]">
                Phone <span className="text-red-600">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+234 …"
                className={`${inputClass} mt-1.5`}
                {...register("phone")}
              />
              {errors.phone ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.phone.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="whatsapp_number" className="block text-sm font-medium text-[var(--lv-ink)]">
                WhatsApp number <span className="text-red-600">*</span>
              </label>
              <input
                id="whatsapp_number"
                type="tel"
                autoComplete="tel"
                placeholder="Same as phone is fine"
                className={`${inputClass} mt-1.5`}
                {...register("whatsapp_number")}
              />
              {errors.whatsapp_number ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.whatsapp_number.message}
                </p>
              ) : null}
            </div>
          </div>

        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-[var(--lv-ink)]">Verification product</legend>
          <div>
            <label htmlFor="product_id" className="block text-sm font-medium text-[var(--lv-ink)]">
              Product <span className="text-red-600">*</span>
            </label>
            <select
              id="product_id"
              disabled={Boolean(intakePayment)}
              className={`${inputClass} mt-1.5`}
              {...register("product_id")}
            >
              <option value="" disabled>
                Select a product
              </option>
              {PRODUCTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.priceLabel} ({p.timeline})
                </option>
              ))}
            </select>
            {errors.product_id ? (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.product_id.message}
              </p>
            ) : null}
          </div>
        </fieldset>

        {persistenceConfigured ? (
          <fieldset className="space-y-4 rounded-2xl border-2 border-[var(--lv-primary)]/40 bg-[var(--lv-card)] p-6 shadow-sm">
            <legend className="px-1 text-base font-semibold text-[var(--lv-ink)]">
              Payment service <span className="text-xs font-normal text-[var(--lv-ink-muted)]">(Paystack)</span>
            </legend>

            <div className="flex flex-wrap items-center gap-2">
              {!paymentsConfigured ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950 dark:bg-amber-900/50 dark:text-amber-100">
                  Checkout unavailable — add Paystack on the server
                </span>
              ) : paystackTestMode ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100">
                  Paystack test mode (demo / no real money with test cards)
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  Live Paystack checkout
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-[var(--lv-ink-muted)]">
              This section is a <strong className="text-[var(--lv-ink)]">separate payment service</strong> run by
              Paystack. You do <strong className="text-[var(--lv-ink)]">not</strong> enter card or bank numbers on this
              LandVerify page — only on Paystack after you continue.
            </p>

            <ol className="list-inside list-decimal space-y-2 text-sm text-[var(--lv-ink-muted)]">
              <li>
                Fill in your <strong className="text-[var(--lv-ink)]">email</strong> and choose your{" "}
                <strong className="text-[var(--lv-ink)]">verification tier</strong> in the sections above.
              </li>
              <li>
                Read the agreement below and tick the box — that is your acknowledgement to proceed with payment for
                the selected tier.
              </li>
              <li>
                Click <strong className="text-[var(--lv-ink)]">Pay with Paystack</strong> (when enabled). A new step
                opens on <strong className="text-[var(--lv-ink)]">Paystack</strong> where you enter payment details
                (card, bank transfer, USSD, etc., depending on what Paystack offers).
              </li>
              <li>
                After Paystack shows success, you return here; then complete the rest of the form and use{" "}
                <strong className="text-[var(--lv-ink)]">Submit details</strong>.
              </li>
            </ol>

            {paymentsConfigured && paystackTestMode ? (
              <p className="text-sm text-[var(--lv-ink-muted)]">
                Use Paystack&apos;s test cards and OTP flows — see{" "}
                <a
                  href="https://paystack.com/docs/payments/test-payments"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
                >
                  Paystack test payments
                </a>
                .
              </p>
            ) : null}

            {quoteKobo != null && selectedProductId ? (
              <p className="text-sm font-medium text-[var(--lv-ink)]">
                Amount for selected tier:{" "}
                <span className="text-[var(--lv-primary)]">{formatNgnFromKobo(quoteKobo)}</span>
              </p>
            ) : (
              <p className="text-sm text-[var(--lv-ink-faint)]">Select a product tier above to see the amount.</p>
            )}

            {paymentsConfigured ? (
              <>
                <div className="flex gap-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 p-4">
                  <input
                    id="payment_service_consent"
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]"
                    checked={paymentServiceConsent}
                    onChange={(e) => setPaymentServiceConsent(e.target.checked)}
                  />
                  <label htmlFor="payment_service_consent" className="text-sm leading-relaxed text-[var(--lv-ink)]">
                    I understand this section is a <strong className="text-[var(--lv-ink)]">payment service</strong>.
                    By ticking this box and continuing to Paystack, I agree I am purchasing the verification tier shown
                    above and I want LandVerify to deliver that paid service after I submit this request form.
                  </label>
                </div>
                {intakePayment ? (
                  <div className="rounded-xl border border-green-600/30 bg-green-50/90 px-4 py-3 text-sm text-green-950 dark:border-green-700/40 dark:bg-green-950/35 dark:text-green-100">
                    <p className="font-semibold text-green-900 dark:text-green-200">Paystack payment confirmed</p>
                    <p className="mt-1 text-green-900/90 dark:text-green-100/90">
                      {intakePayment.tierLabel} ({intakePayment.amountDisplay}). Use the same email you paid with; it
                      should match <span className="font-mono font-medium">{intakePayment.emailHint}</span>.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handlePayWithPaystack()}
                    disabled={payBusy}
                    className="inline-flex w-full min-h-12 items-center justify-center rounded-xl bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 sm:w-auto"
                  >
                    {payBusy ? "Opening Paystack checkout…" : "Continue to Paystack to enter payment details"}
                  </button>
                )}
              </>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-100">
                <p>
                  <strong className="text-[var(--lv-ink)]">Paystack is not configured on this deployment.</strong> Add
                  the server variable{" "}
                  <code className="rounded bg-[var(--lv-muted)] px-1 text-xs text-[var(--lv-ink)]">PAYSTACK_SECRET_KEY</code>{" "}
                  (test key <code className="text-xs">sk_test_…</code> or live <code className="text-xs">sk_live_…</code>)
                  in Vercel, redeploy, then refresh this page. The acknowledgement and Paystack button will activate
                  automatically.
                </p>
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full cursor-not-allowed min-h-12 items-center justify-center rounded-xl border border-amber-300/80 bg-amber-100/50 px-4 py-3 text-sm font-semibold text-amber-900/70 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200/60 sm:w-auto"
                >
                  Pay with Paystack (configure server to enable)
                </button>
              </div>
            )}
          </fieldset>
        ) : null}

        <fieldset className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-[var(--lv-ink)]">Land location</legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-[var(--lv-ink)]">
                State <span className="text-red-600">*</span>
              </label>
              <select id="state" className={`${inputClass} mt-1.5`} {...register("state")}>
                <option value="" disabled>
                  Choose state
                </option>
                {REQUEST_INTAKE_STATE_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.state ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.state.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="lga" className="block text-sm font-medium text-[var(--lv-ink)]">
                Local government area (LGA) <span className="text-red-600">*</span>
              </label>
              <select
                id="lga"
                className={`${inputClass} mt-1.5`}
                disabled={!selectedStateAsSupported}
                {...register("lga")}
              >
                <option value="" disabled>
                  {selectedStateAsSupported ? "Choose LGA" : "Select state first"}
                </option>
                {availableLgas.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
              {errors.lga ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.lga.message}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <label htmlFor="land_location_description" className="block text-sm font-medium text-[var(--lv-ink)]">
              Describe the land location <span className="text-red-600">*</span>
            </label>
            <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">
              Don&apos;t have coordinates or map link? Leave them empty and use the map picker below.
            </p>
            <textarea
              id="land_location_description"
              rows={5}
              placeholder="Roads, landmarks, estate name, directions…"
              className={`${inputClass} mt-1.5 min-h-[120px] resize-y`}
              {...register("land_location_description")}
            />
            {errors.land_location_description ? (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.land_location_description.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/35 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">Quick guide</p>
            <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-[var(--lv-ink-muted)]">
              <li>Select your state to center the map.</li>
              <li>Search a place or click the exact location on the map.</li>
              <li>We auto-fill coordinates and map link for you.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/35 p-4">
            <p className="text-sm font-medium text-[var(--lv-ink)]">Pick location on map</p>
            <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">
              Map defaults to the selected state. Click once on the map and we auto-fill both coordinates and Google
              Maps link.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[var(--lv-muted)] px-2 py-1 text-xs font-medium text-[var(--lv-ink-muted)]">
                Map centered on: {selectedState || "Lagos"}
              </span>
              {hasLocationSelected ? (
                <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                  Location captured
                </span>
              ) : (
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                  Location not selected yet
                </span>
              )}
            </div>
            {hasLocationSelected ? (
              <p className="mt-2 text-xs text-[var(--lv-ink-muted)]">
                Selected point: <span className="font-semibold text-[var(--lv-ink)]">{previewPoint?.lat.toFixed(6)}, {previewPoint?.lng.toFixed(6)}</span>
              </p>
            ) : null}
            {stateChangedNotice ? (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                State changed after picking a point. Reset location and pick again if the old point is no longer valid.
              </div>
            ) : null}

            <div className="mt-3">
              <LocationMapPicker
                state={selectedState as "" | "Lagos" | "Ogun" | "Oyo" | "Osun"}
                point={previewPoint}
                onPick={handleMapPick}
              />
            </div>
            {mapMessage ? (
              <p className="mt-2 text-xs text-[var(--lv-ink-muted)]" role="status">
                {mapMessage}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={resetPickedLocation}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-300 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                Reset location
              </button>
            </div>
          </div>

          <details className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--lv-ink)]">
              Advanced (optional): edit map link or coordinates manually
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="google_maps_link" className="block text-sm font-medium text-[var(--lv-ink)]">
                  Google Maps link <span className="text-[var(--lv-ink-faint)]">(optional)</span>
                </label>
                <input
                  id="google_maps_link"
                  type="url"
                  inputMode="url"
                  placeholder="https://maps.app.goo.gl/…"
                  className={`${inputClass} mt-1.5`}
                  {...register("google_maps_link")}
                />
                {errors.google_maps_link ? (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {String(errors.google_maps_link.message)}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="coordinates" className="block text-sm font-medium text-[var(--lv-ink)]">
                  GPS coordinates <span className="text-[var(--lv-ink-faint)]">(optional)</span>
                </label>
                <input
                  id="coordinates"
                  placeholder="e.g. 6.5244, 3.3792"
                  className={`${inputClass} mt-1.5`}
                  {...register("coordinates")}
                />
                {errors.coordinates ? (
                  <p className="mt-1 text-sm text-red-600" role="alert">
                    {String(errors.coordinates.message)}
                  </p>
                ) : null}
              </div>
            </div>
          </details>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-[var(--lv-ink)]">Seller / vendor</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="seller_name" className="block text-sm font-medium text-[var(--lv-ink)]">
                Seller name <span className="text-red-600">*</span>
              </label>
              <input id="seller_name" type="text" className={`${inputClass} mt-1.5`} {...register("seller_name")} />
              {errors.seller_name ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.seller_name.message}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="seller_phone" className="block text-sm font-medium text-[var(--lv-ink)]">
                Seller phone <span className="text-red-600">*</span>
              </label>
              <input id="seller_phone" type="tel" className={`${inputClass} mt-1.5`} {...register("seller_phone")} />
              {errors.seller_phone ? (
                <p className="mt-1 text-sm text-red-600" role="alert">
                  {errors.seller_phone.message}
                </p>
              ) : null}
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-[var(--lv-ink)]">Documents (optional)</legend>
          <p className="text-sm text-[var(--lv-ink-muted)]">
            Survey plan, deed, allocation letter, etc. When the site is connected to Supabase Storage, files are stored
            privately and your team can download them from the manager request page.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            className="block w-full max-w-lg text-sm text-[var(--lv-ink-muted)] file:mr-4 file:rounded-md file:border-0 file:bg-[var(--lv-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <p className="text-xs text-[var(--lv-ink-faint)]">
            Up to {MAX_DOCUMENTS} files, {MAX_FILE_BYTES / (1024 * 1024)} MB each — PDF, JPEG, PNG, or WebP.
          </p>
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-[var(--lv-ink)]">Anything else</legend>
          <div>
            <label htmlFor="additional_notes" className="block text-sm font-medium text-[var(--lv-ink)]">
              Additional notes <span className="text-[var(--lv-ink-faint)]">(optional)</span>
            </label>
            <textarea
              id="additional_notes"
              rows={3}
              className={`${inputClass} mt-1.5 min-h-[88px] resize-y`}
              {...register("additional_notes")}
            />
            {errors.additional_notes ? (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.additional_notes.message}
              </p>
            ) : null}
          </div>

          <div className="flex gap-3 rounded-xl bg-[var(--lv-muted)]/60 p-4">
            <input
              id="consent"
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]"
              {...register("consent")}
            />
            <label htmlFor="consent" className="text-sm leading-relaxed text-[var(--lv-ink)]">
              I understand LandVerify provides risk-based verification insights—not government ownership proof or legal
              advice. <span className="text-red-600">*</span>
            </label>
          </div>
          {errors.consent ? (
            <p className="text-sm text-red-600" role="alert">
              {errors.consent.message}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
          <legend className="px-1 text-lg font-semibold text-[var(--lv-ink)]">CAPTCHA</legend>
          <p className="text-sm text-[var(--lv-ink-muted)]">
            Quick human check: what is <strong>{captchaA}</strong> + <strong>{captchaB}</strong>?
          </p>
          <div className="max-w-xs">
            <label htmlFor="captcha_answer" className="block text-sm font-medium text-[var(--lv-ink)]">
              Answer <span className="text-red-600">*</span>
            </label>
            <input
              id="captcha_answer"
              type="text"
              inputMode="numeric"
              className={`${inputClass} mt-1.5`}
              {...register("captcha_answer")}
            />
            {errors.captcha_answer ? (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.captcha_answer.message}
              </p>
            ) : null}
          </div>

          <div className="hidden" aria-hidden>
            <label htmlFor="website">Leave this field empty</label>
            <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
          </div>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              submitBlocked ||
              (persistenceConfigured && !paymentsConfigured)
            }
            className="inline-flex min-h-12 min-w-[10rem] items-center justify-center rounded-lg bg-[var(--lv-primary)] px-6 text-sm font-semibold text-white shadow-md hover:opacity-95 disabled:opacity-60"
          >
            {isSubmitting ? "Checking…" : "Submit details"}
          </button>
          <p className="text-xs text-[var(--lv-ink-faint)]">
            {persistenceConfigured && !paymentsConfigured
              ? "Configure Paystack to enable live submissions."
              : payFirstLive && submitBlocked
                ? "Complete Paystack payment above first — the submit button stays disabled until payment succeeds."
                : persistenceConfigured
                  ? "Payment is confirmed on Paystack before you can submit; your tier is saved with your case."
                  : "Database not configured on this server—contact will not persist until Supabase credentials are added."}
          </p>
        </div>
      </form>
      )}
    </div>
  );
}
