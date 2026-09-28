import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { loginFormSchema, type LoginFormInput, type LoginFormValues } from '../auth.schemas';
import { AuthError } from '../authService';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordField } from '../components/PasswordField';
import { useAuth } from '../useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof AuthError ? error.message : 'No pudimos iniciar sesión. Intenta de nuevo más tarde.',
      );
    }
  });

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Consulta tu saldo y las estadísticas del día."
      footer={
        <>
          ¿Aún no tienes cuenta?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {submitError ? <Alert tone="error" title={submitError} /> : null}

        <TextField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting} loadingText="Verificando..." icon={<LogIn className="size-4" aria-hidden="true" />}>
          Iniciar sesión
        </Button>
      </form>
    </AuthLayout>
  );
}
