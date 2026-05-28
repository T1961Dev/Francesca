import { updateProfileAction } from "@/app/dashboard/settings/actions"
import { getProfileFieldValue } from "@/lib/profile/prefill"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { Textarea } from "@/components/ui/textarea"

const groups = [
  {
    title: "Account",
    description: "Personal details used around the app.",
    fields: [
      ["full_name", "Full name"],
      ["role", "Role"],
      ["location", "Location"],
    ],
  },
  {
    title: "Company",
    description: "How the business should appear in reports.",
    fields: [
      ["company_name", "Company name"],
      ["website", "Website"],
      ["industry", "Industry"],
      ["stage", "Stage"],
    ],
  },
  {
    title: "Raise",
    description: "Funding context for models and investor matching.",
    fields: [
      ["funding_stage", "Funding stage"],
      ["target_raise", "Target raise"],
    ],
  },
] as const

function fieldValue(profile: Record<string, unknown> | null, field: string) {
  return getProfileFieldValue(profile, field)
}

export function ProfileForm({
  profile,
  saved,
  errorMessage,
}: {
  profile: Record<string, unknown> | null
  saved?: boolean
  errorMessage?: string
}) {
  return (
    <form action={updateProfileAction} className="grid gap-3 lg:grid-cols-[0.82fr_1.18fr]">
      {saved ? (
        <Alert className="lg:col-span-2">
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>Your profile was updated.</AlertDescription>
        </Alert>
      ) : null}
      {errorMessage ? (
        <Alert className="lg:col-span-2" variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="bg-muted/20">
        <CardHeader className="pb-1">
          <CardTitle>Sign-in email</CardTitle>
          <CardDescription>
            Synced from Supabase Auth and shown in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5 rounded-lg bg-card p-2.5 ring-1 ring-border/55">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              readOnly
              disabled
              className="bg-muted"
              defaultValue={fieldValue(profile, "email")}
            />
          </div>
          <div className="rounded-lg bg-accent p-3">
            <p className="text-sm font-medium">Profile context</p>
            <p className="mt-1 text-xs leading-relaxed text-accent-foreground/85">
              These details power deck reports, models, and investor matching.
            </p>
          </div>
          <SubmitButton
            className="w-full"
            idleText="Save settings"
            pendingText="Saving..."
          />
        </CardContent>
      </Card>

      <Card className="min-h-0 bg-muted/20">
        <CardContent className="grid h-full gap-3 p-4 lg:grid-cols-2">
          {groups.map((group) => (
            <section
              key={group.title}
              className={group.title === "Raise" ? "space-y-2 lg:col-span-2" : "space-y-2"}
            >
              <div>
                <h3 className="font-heading text-xl leading-none">
                  {group.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.description}
                </p>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {group.fields.map(([field, label]) => (
                  <div
                    key={field}
                    className="space-y-1.5 rounded-lg bg-card p-2.5 ring-1 ring-border/55"
                  >
                    <Label htmlFor={field}>{label}</Label>
                    <Input
                      id={field}
                      name={field}
                      defaultValue={fieldValue(profile, field)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
          <div className="space-y-1.5 rounded-lg bg-card p-2.5 ring-1 ring-border/55 lg:col-span-2">
            <Label htmlFor="description">Company description</Label>
            <Textarea
              id="description"
              name="description"
              className="min-h-12 resize-none"
              defaultValue={fieldValue(profile, "description")}
              placeholder="What do you do, who is it for, and why now?"
            />
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
