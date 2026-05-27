import Link from "next/link"

import { saveOnboardingStep } from "@/app/onboarding/actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { requireAuth, getProfile } from "@/lib/auth"
import {
  COUNTRIES,
  CURRENCIES,
  CURRENCY_LABEL,
  SECTORS,
  STAGES,
  STAGE_LABEL,
  isOnboardingComplete,
} from "@/lib/onboarding"

const TOTAL_STEPS = 5

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; error?: string }>
}) {
  await requireAuth()
  const profile = await getProfile()

  if (isOnboardingComplete(profile)) {
    return (
      <Shell step={5} pct={100}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>You&apos;re all set</CardTitle>
            <CardDescription>
              Your founder profile is complete. Head to the dashboard to upload your deck.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    )
  }

  const params = await searchParams
  const stepFromUrl = Number(params.step ?? "1")
  const step = Math.min(Math.max(Number.isFinite(stepFromUrl) ? stepFromUrl : 1, 1), TOTAL_STEPS)
  const error = params.error?.trim() || null
  const pct = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <Shell step={step} pct={pct}>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{titleFor(step)}</CardTitle>
          <CardDescription>{descriptionFor(step)}</CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <form action={saveOnboardingStep} className="space-y-4">
            <input type="hidden" name="step" value={step} />

            {step === 1 ? (
              <div className="space-y-2">
                <Label htmlFor="company_name">Company name</Label>
                <Input
                  id="company_name"
                  name="company_name"
                  type="text"
                  defaultValue={profile?.company_name ?? ""}
                  required
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-2">
                <Label htmlFor="sector">Sector</Label>
                <Select name="sector" defaultValue={profile?.sector ?? profile?.industry ?? undefined}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Pick a sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-3">
                <Label>Stage</Label>
                {STAGES.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="stage"
                      value={s}
                      defaultChecked={(profile?.stage ?? profile?.funding_stage) === s}
                      required
                    />
                    <span>{STAGE_LABEL[s]}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="target_raise">Target raise</Label>
                  <Input
                    id="target_raise"
                    name="target_raise"
                    type="number"
                    min={0}
                    step="any"
                    defaultValue={
                      typeof profile?.target_raise === "number" ? profile.target_raise : ""
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_raise_currency">Currency</Label>
                  <Select
                    name="target_raise_currency"
                    defaultValue={profile?.target_raise_currency ?? "gbp"}
                  >
                    <SelectTrigger id="target_raise_currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CURRENCY_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-2">
                <Label htmlFor="geography">Geography</Label>
                <Select
                  name="geography"
                  defaultValue={profile?.geography ?? profile?.location ?? "United Kingdom"}
                >
                  <SelectTrigger id="geography">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-2">
              {step > 1 ? (
                <Button asChild variant="ghost" type="button">
                  <Link href={`/onboarding?step=${step - 1}`}>Back</Link>
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit">
                {step === TOTAL_STEPS ? "Finish" : "Next"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </Shell>
  )
}

function Shell({
  step,
  pct,
  children,
}: {
  step: number
  pct: number
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-lg space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Step {step} of {TOTAL_STEPS}
        </p>
        <Progress value={pct} />
      </div>
      {children}
    </main>
  )
}

function titleFor(step: number) {
  switch (step) {
    case 1:
      return "What's your company called?"
    case 2:
      return "What sector are you in?"
    case 3:
      return "What stage are you raising at?"
    case 4:
      return "How much are you raising?"
    case 5:
      return "Where are you based?"
    default:
      return "Set up your profile"
  }
}

function descriptionFor(step: number) {
  switch (step) {
    case 1:
      return "Used to brand your reports and personalise investor matching."
    case 2:
      return "We tailor your analysis and investor matches to your sector."
    case 3:
      return "Affects which investors and ranges we focus on."
    case 4:
      return "We use this to size your investor list and your model."
    case 5:
      return "Default search geography for investor matching. You can broaden later."
    default:
      return ""
  }
}
