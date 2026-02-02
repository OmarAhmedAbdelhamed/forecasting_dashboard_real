'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ArrowRight, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';

interface FormErrors {
  name?: string;
  surname?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface TouchedFields {
  name?: boolean;
  surname?: boolean;
  email?: boolean;
  password?: boolean;
  confirmPassword?: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, isLoading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Zayıf', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Orta', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Güçlü', color: 'bg-green-500' };
    return { score, label: 'Çok Güçlü', color: 'bg-green-600' };
  }, [password]);

  const passwordRequirements = [
    { met: password.length >= 6, label: 'En az 6 karakter' },
    { met: /[A-Z]/.test(password), label: 'Bir büyük harf' },
    { met: /[0-9]/.test(password), label: 'Bir rakam' },
    { met: /[^A-Za-z0-9]/.test(password), label: 'Bir özel karakter' },
  ];

  const validateName = (value: string): string | undefined => {
    if (!value.trim()) return 'Ad gereklidir';
    if (value.trim().length < 2) return 'Ad en az 2 karakter olmalıdır';
    return undefined;
  };

  const validateSurname = (value: string): string | undefined => {
    if (!value.trim()) return 'Soyad gereklidir';
    if (value.trim().length < 2) return 'Soyad en az 2 karakter olmalıdır';
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'E-posta adresi gereklidir';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Geçerli bir e-posta adresi girin';
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Şifre gereklidir';
    if (value.length < 6) return 'Şifre en az 6 karakter olmalıdır';
    return undefined;
  };

  const validateConfirmPassword = (value: string): string | undefined => {
    if (!value) return 'Şifre tekrarı gereklidir';
    if (value !== password) return 'Şifreler eşleşmiyor';
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      name: validateName(name),
      surname: validateSurname(surname),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword),
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const validators: Record<keyof TouchedFields, () => string | undefined> = {
      name: () => validateName(name),
      surname: () => validateSurname(surname),
      email: () => validateEmail(email),
      password: () => validatePassword(password),
      confirmPassword: () => validateConfirmPassword(confirmPassword),
    };
    setErrors((prev) => ({ ...prev, [field]: validators[field]() }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      name: true,
      surname: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!validateForm()) {
      return;
    }

    // Simulate registration
    const result = await register({
      name,
      email,
      password,
    });

    if (result.success) {
      router.push('/dashboard');
    } else {
      setErrors((prev) => ({
        ...prev,
        email: result.error || 'Kayıt başarısız',
      }));
    }
  };

  const getInputClassName = (field: keyof TouchedFields) => {
    const baseClass =
      'bg-white border-slate-200 focus:border-primary focus:ring-primary/20';
    const errorClass =
      touched[field] && errors[field]
        ? 'border-red-500 focus:border-red-500'
        : '';
    return `${baseClass} ${errorClass}`;
  };

  return (
    <div className='w-full max-w-md 2xl:max-w-lg mx-auto mt-8 2xl:mt-12'>
      {/* Logo Section */}
      <div className='flex flex-col items-center mb-6 2xl:mb-8'>
        <div className='w-16 h-16 2xl:w-20 2xl:h-20 rounded-xl bg-white shadow-lg flex items-center justify-center p-2 mb-3'>
          <Image
            src='/bee2_ai_logo.svg'
            alt='Bee2 AI'
            width={80}
            height={80}
            className='w-full h-full object-contain'
            priority
          />
        </div>
        <h1 className='text-xl 2xl:text-2xl font-bold text-foreground'>
          Bee2 AI Forecasting
        </h1>
        <p className='text-xs 2xl:text-sm text-muted-foreground mt-1'>
          Tahminleme ve Planlama Platformu
        </p>
      </div>

      <Card className='shadow-xl'>
        <CardHeader className='space-y-1 2xl:space-y-2'>
          <CardTitle className='text-2xl 2xl:text-3xl font-bold'>
            Kayıt Ol
          </CardTitle>
          <CardDescription className='2xl:text-base'>
            Yeni bir hesap oluşturmak için bilgilerinizi girin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className='space-y-4 2xl:space-y-5'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='name' className='2xl:text-base'>
                  Ad
                </Label>
                <Input
                  id='name'
                  placeholder='Ahmet'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => handleBlur('name')}
                  className={`${getInputClassName('name')} 2xl:h-12 2xl:text-base`}
                />
                {touched.name && errors.name && (
                  <p className='text-xs 2xl:text-sm text-red-500'>
                    {errors.name}
                  </p>
                )}
              </div>
              <div className='space-y-2'>
                <Label htmlFor='surname' className='2xl:text-base'>
                  Soyad
                </Label>
                <Input
                  id='surname'
                  placeholder='Yılmaz'
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  onBlur={() => handleBlur('surname')}
                  className={`${getInputClassName('surname')} 2xl:h-12 2xl:text-base`}
                />
                {touched.surname && errors.surname && (
                  <p className='text-xs 2xl:text-sm text-red-500'>
                    {errors.surname}
                  </p>
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email' className='2xl:text-base'>
                E-posta
              </Label>
              <Input
                id='email'
                type='email'
                placeholder='ornek@sirket.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`${getInputClassName('email')} 2xl:h-12 2xl:text-base`}
              />
              {touched.email && errors.email && (
                <p className='text-sm 2xl:text-base text-red-500'>
                  {errors.email}
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password' className='2xl:text-base'>
                Şifre
              </Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`${getInputClassName('password')} pr-10 2xl:h-12 2xl:text-base`}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none'
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4 2xl:h-5 2xl:w-5' />
                  ) : (
                    <Eye className='h-4 w-4 2xl:h-5 2xl:w-5' />
                  )}
                </button>
              </div>
              {touched.password && errors.password && (
                <p className='text-sm 2xl:text-base text-red-500'>
                  {errors.password}
                </p>
              )}

              {/* Password strength indicator */}
              {password && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <div className='flex-1 h-1.5 2xl:h-2 bg-gray-200 rounded-full overflow-hidden'>
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{
                          width: `${(passwordStrength.score / 5) * 100}%`,
                        }}
                      />
                    </div>
                    <span className='text-xs 2xl:text-sm font-medium text-gray-600'>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-1'>
                    {passwordRequirements.map((req, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-1 text-xs 2xl:text-sm ${
                          req.met ? 'text-green-600' : 'text-gray-400'
                        }`}
                      >
                        {req.met ? (
                          <Check className='h-3 w-3 2xl:h-4 2xl:w-4' />
                        ) : (
                          <X className='h-3 w-3 2xl:h-4 2xl:w-4' />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword' className='2xl:text-base'>
                Şifre Tekrarı
              </Label>
              <div className='relative'>
                <Input
                  id='confirmPassword'
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`${getInputClassName('confirmPassword')} pr-10 2xl:h-12 2xl:text-base`}
                />
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none'
                >
                  {showConfirmPassword ? (
                    <EyeOff className='h-4 w-4 2xl:h-5 2xl:w-5' />
                  ) : (
                    <Eye className='h-4 w-4 2xl:h-5 2xl:w-5' />
                  )}
                </button>
              </div>
              {touched.confirmPassword && errors.confirmPassword && (
                <p className='text-sm 2xl:text-base text-red-500'>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type='submit'
              className='w-full font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] 2xl:h-12 2xl:text-base'
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 2xl:h-5 2xl:w-5 animate-spin' />
                  Kayıt Olunuyor...
                </>
              ) : (
                <>
                  Kayıt Ol
                  <ArrowRight className='ml-2 h-4 w-4 2xl:h-5 2xl:w-5' />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className='flex flex-col space-y-4 text-center text-sm 2xl:text-base text-muted-foreground'>
          <div className='relative w-full'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-slate-200' />
            </div>
            <div className='relative flex justify-center text-xs 2xl:text-sm uppercase'>
              <span className='bg-white px-2 text-muted-foreground'>
                Zaten hesabınız var mı?
              </span>
            </div>
          </div>
          <div className='text-center'>
            <Link
              href='/auth/login'
              className='font-semibold text-primary hover:underline'
            >
              Giriş Yap
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
