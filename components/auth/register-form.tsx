"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { getRegisterSchema, type RegisterInput } from "@/lib/validations/auth";
import { useRegister } from "@/hooks/use-register";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TechnologyMultiSelect } from "./technology-multi-select";
import { AuthFoxLogo } from "@/components/auth/auth-fox-logo";
import { cn } from "@/lib/utils";
import { ColorPickerPopover } from "@/components/ui/color-picker-popover";
import { invitationPublicService } from "@/services/invitation-service";
import { teamService } from "@/services/team-service";

const SALES_BADGE_PRESETS = [
  { bg: "#EEF2FF", text: "#3730A3" },
  { bg: "#ECFDF3", text: "#166534" },
  { bg: "#FFF7ED", text: "#9A3412" },
  { bg: "#FDF2F8", text: "#9D174D" },
  { bg: "#F0F9FF", text: "#0C4A6E" },
  { bg: "#F5F3FF", text: "#5B21B6" },
];

type RegisterFormProps = {
  allowAdminRegistration?: boolean;
  allowSuperAdminRegistration?: boolean;
  /** Код із query `?code=` — роль і email фіксуються запрошенням. */
  invitationCodeFromUrl?: string | null;
};

export function RegisterForm({
  allowAdminRegistration = false,
  allowSuperAdminRegistration = false,
  invitationCodeFromUrl,
}: RegisterFormProps) {
  const { mutate: register, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { data: inviteMeta, isLoading: inviteLoading, isError: inviteError } = useQuery({
    queryKey: ["invitation-validate", invitationCodeFromUrl],
    queryFn: () => invitationPublicService.validate(invitationCodeFromUrl!),
    enabled: !!invitationCodeFromUrl,
    retry: false,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ["teams-public-register"],
    queryFn: () => teamService.listPublic(),
    enabled: !invitationCodeFromUrl,
  });

  const registerSchema = useMemo(
    () => getRegisterSchema(allowAdminRegistration, allowSuperAdminRegistration),
    [allowAdminRegistration, allowSuperAdminRegistration],
  );

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as Resolver<RegisterInput>,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "SALES",
      specialization: undefined,
      technologyIds: [],
      badgeBgColor: "#EEF2FF",
      badgeTextColor: "#3730A3",
      teamName: "",
      teamId: "",
    },
  });

  useEffect(() => {
    if (!allowAdminRegistration && form.getValues("role") === "ADMIN") {
      form.setValue("role", "SALES");
    }
    if (!allowSuperAdminRegistration && form.getValues("role") === "SUPER_ADMIN") {
      form.setValue("role", "SALES");
    }
  }, [allowAdminRegistration, allowSuperAdminRegistration, form]);

  useEffect(() => {
    if (inviteMeta) {
      form.setValue("email", inviteMeta.email);
      form.setValue("role", inviteMeta.role);
      form.setValue("teamId", inviteMeta.teamId ?? "");
    }
  }, [inviteMeta, form]);

  const watchRole = form.watch("role");
  const watchBadgeBg = form.watch("badgeBgColor");
  const watchBadgeText = form.watch("badgeTextColor");

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <AuthFoxLogo />
        <CardTitle className="text-2xl">Реєстрація</CardTitle>
        <CardDescription className="space-y-1">
          <span className="block">
            {invitationCodeFromUrl
              ? "Реєстрація за запрошенням адміністратора"
              : "Створіть новий акаунт у Foxy Sale CRM"}
          </span>
          {!invitationCodeFromUrl && (
            <span className="block text-xs text-muted-foreground">
              Після реєстрації адміністратор має підтвердити доступ до системи.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {inviteError && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Запрошення недійсне або вже використане. Зверніться до адміністратора за новим посиланням.
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) =>
              register({
                ...data,
                invitationCode: invitationCodeFromUrl ?? undefined,
              }),
            )}
            className="grid gap-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ім&apos;я</FormLabel>
                    <FormControl>
                      <Input placeholder="Іван" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Прізвище</FormLabel>
                    <FormControl>
                      <Input placeholder="Шевченко" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      readOnly={!!inviteMeta}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Пароль</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground active:not-aria-[haspopup]:-translate-y-1/2"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Приховати пароль" : "Показати пароль"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Підтвердження пароля</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••"
                        className="pr-10"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground hover:text-foreground active:not-aria-[haspopup]:-translate-y-1/2"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Приховати підтвердження пароля" : "Показати підтвердження пароля"}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div
              className={cn(
                "grid min-w-0 gap-4",
                watchRole === "DEV" || watchRole === "DESIGNER"
                  ? "grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="w-full min-w-0">
                    <FormLabel>Роль</FormLabel>
                    <Select
                      disabled={!!inviteMeta}
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (val !== "DEV" && val !== "DESIGNER") {
                          form.setValue("specialization", undefined);
                          form.setValue("technologyIds", []);
                        }
                        if (val !== "SALES") {
                          form.setValue("badgeBgColor", "#EEF2FF");
                          form.setValue("badgeTextColor", "#3730A3");
                        }
                        if (val !== "ADMIN") {
                          form.setValue("teamName", "");
                        }
                        if (val === "SUPER_ADMIN") {
                          form.setValue("teamId", "");
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Оберіть роль" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allowSuperAdminRegistration && (
                          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        )}
                        {allowAdminRegistration && (
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        )}
                        <SelectItem value="DEV">Розробник</SelectItem>
                        <SelectItem value="DESIGNER">Дизайнер</SelectItem>
                        <SelectItem value="SALES">Сейл</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchRole === "DEV" && (
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem className="w-full min-w-0">
                      <FormLabel>Спеціалізація</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Оберіть спеціалізацію" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FRONTEND">Frontend</SelectItem>
                          <SelectItem value="BACKEND">Backend</SelectItem>
                          <SelectItem value="FULLSTACK">Fullstack</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchRole === "DESIGNER" && (
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem className="w-full min-w-0">
                      <FormLabel>Спеціалізація</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Оберіть спеціалізацію" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="UX_UI">UX/UI</SelectItem>
                          <SelectItem value="UI">UI</SelectItem>
                          <SelectItem value="UX">UX</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {watchRole === "ADMIN" && (
              <FormField
                control={form.control}
                name="teamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Назва команди</FormLabel>
                    <FormControl>
                      <Input placeholder="Наприклад: Foxy Sales Team A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchRole !== "ADMIN" && watchRole !== "SUPER_ADMIN" && (
              <FormField
                control={form.control}
                name="teamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Команда</FormLabel>
                    <FormControl>
                      {inviteMeta?.teamId ? (
                        <Input
                          value={inviteMeta.teamName || "Команда з запрошення"}
                          readOnly
                        />
                      ) : (
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                          disabled={teams.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={teams.length ? "Оберіть команду" : "Немає доступних команд"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchRole === "DEV" && (
              <FormField
                control={form.control}
                name="technologyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Технології</FormLabel>
                    <FormControl>
                      <TechnologyMultiSelect
                        audience="DEV"
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchRole === "DESIGNER" && (
              <FormField
                control={form.control}
                name="technologyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Інструменти / стек</FormLabel>
                    <FormControl>
                      <TechnologyMultiSelect
                        audience="DESIGNER"
                        value={field.value ?? []}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchRole === "SALES" && (
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Стиль бейджа сейла</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Приклад:</span>
                  <Badge
                    variant="outline"
                    className="h-6 px-2.5 text-sm"
                    style={{
                      backgroundColor: watchBadgeBg || "#EEF2FF",
                      color: watchBadgeText || "#3730A3",
                      borderColor: watchBadgeText || "#3730A3",
                    }}
                  >
                    Сейл: {form.getValues("firstName") || "Ім'я"} {form.getValues("lastName") || "Прізвище"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="badgeBgColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Колір фону</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="#EEF2FF"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                            <ColorPickerPopover
                              value={field.value || "#EEF2FF"}
                              onChange={field.onChange}
                              ariaLabel="Вибрати колір фону"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="badgeTextColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Колір тексту</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="#3730A3"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                            <ColorPickerPopover
                              value={field.value || "#3730A3"}
                              onChange={field.onChange}
                              ariaLabel="Вибрати колір тексту"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Готові стилі</p>
                  <div className="flex flex-wrap gap-2">
                    {SALES_BADGE_PRESETS.map((preset) => {
                      const active =
                        (watchBadgeBg || "").toLowerCase() === preset.bg.toLowerCase() &&
                        (watchBadgeText || "").toLowerCase() === preset.text.toLowerCase();
                      return (
                        <button
                          key={`${preset.bg}-${preset.text}`}
                          type="button"
                          onClick={() => {
                            form.setValue("badgeBgColor", preset.bg, { shouldDirty: true, shouldValidate: true });
                            form.setValue("badgeTextColor", preset.text, { shouldDirty: true, shouldValidate: true });
                          }}
                          className={cn(
                            "h-7 w-7 rounded-full border transition",
                            active ? "ring-2 ring-primary ring-offset-2" : "hover:scale-105"
                          )}
                          style={{ backgroundColor: preset.bg, borderColor: preset.text }}
                          aria-label={`preset ${preset.bg}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isPending || inviteLoading || !!inviteError || (!!invitationCodeFromUrl && !inviteMeta)}
            >
              {isPending ? "Реєстрація..." : inviteLoading ? "Перевірка запрошення..." : "Зареєструватися"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Вже є акаунт?{" "}
          <Link href="/login" className="text-primary underline">
            Увійти
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
