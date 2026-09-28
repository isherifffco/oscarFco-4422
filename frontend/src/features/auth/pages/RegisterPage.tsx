import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { StorageUnavailableError } from '@/lib/storage';
import { registerFormSchema, type RegisterFormInput, type RegisterFormValues } from '../auth.schemas';
import { AuthError } from '../authService';
import { AuthLayout } from '../components/AuthLayout';
import { PasswordChecklist } from '../components/PasswordChecklist';
import { PasswordField } from '../components/PasswordField';
import { useAuth } from '../useAuth';

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const password = useWatch({ control, name: 'password' });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await registerUser(values);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error instanceof AuthError || error instanceof StorageUnavailableError) {
        setSubmitError(error.message);
        return;
      }
      setSubmitError('No pudimos crear tu cuenta. Intenta de nuevo más tarde.');
    }
  });

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empiezas con saldo de $0.00; puedes recargar con SnailPay."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {submitError ? <Alert tone="error" title={submitError} /> : null}

        <TextField
          label="Nombre completo"
          autoComplete="name"
          placeholder="Ana Pérez López"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
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
          autoComplete="new-password"
          error={errors.password?.message}
          hint={<PasswordChecklist password={password} />}
          {...register('password')}
        />
        <PasswordField
          label="Confirmar contraseña"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          className="w-full"
          isLoading={isSubmitting}
          loadingText="Creando cuenta..."
          icon={<UserPlus className="size-4" aria-hidden="true" />}
        >
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
