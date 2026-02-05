'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/shared/button';
import { Input } from '@/components/ui/shared/input';
import { Label } from '@/components/ui/shared/label';
import { Checkbox } from '@/components/ui/shared/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/shared/card';

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{
    email?: boolean;
    password?: boolean;
  }>({});

  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return 'E-posta adresi gereklidir';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Geçerli bir e-posta adresi girin';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Şifre gereklidir';
    }
    if (password.length < 6) {
      return 'Şifre en az 6 karakter olmalıdır';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    } else {
      setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!validateForm()) {
      return;
    }

    // Simulate login and redirect to dashboard
    const result = await login(email, password);

    if (result.success) {
      // Force hard redirect to ensure state is clean
      window.location.href = '/dashboard';
    } else {
      setErrors((prev) => ({
        ...prev,
        email: result.error || 'Giriş başarısız',
      }));
    }
  };

  return (
    <div className='w-full max-w-md 2xl:max-w-lg mx-auto mt-12 2xl:mt-16'>
      {/* Logo Section */}
      <div className='flex flex-col items-center mb-8 2xl:mb-10'>
        <div className='w-20 h-20 2xl:w-24 2xl:h-24 rounded-2xl bg-white shadow-lg flex items-center justify-center p-2 mb-4'>
          <Image
            src='/bee2_ai_logo.svg'
            alt='Bee2 AI'
            width={96}
            height={96}
            className='w-full h-full object-contain'
            priority
          />
        </div>
        <h1 className='text-2xl 2xl:text-3xl font-bold text-foreground'>
          Bee2 AI Forecasting
        </h1>
        <p className='text-sm 2xl:text-base text-muted-foreground mt-1'>
          Tahminleme ve Planlama Platformu
        </p>
      </div>

      <Card className='shadow-xl'>
        <CardHeader className='space-y-1 2xl:space-y-2'>
          <CardTitle className='text-2xl 2xl:text-3xl font-bold'>
            Giriş Yap
          </CardTitle>
          <CardDescription className='2xl:text-base'>
            Hesabınıza erişmek için bilgilerinizi girin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void handleLogin(e)}
            className='space-y-4 2xl:space-y-5'
          >
            <div className='space-y-2'>
              <Label htmlFor='email' className='2xl:text-base'>
                E-posta
              </Label>
              <Input
                id='email'
                type='email'
                placeholder='ornek@sirket.com'
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                onBlur={() => {
                  handleBlur('email');
                }}
                className={`bg-white border-slate-200 focus:border-primary focus:ring-primary/20 2xl:h-12 2xl:text-base ${
                  touched.email && errors.email
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              {touched.email && errors.email && (
                <p className='text-sm 2xl:text-base text-red-500'>
                  {errors.email}
                </p>
              )}
            </div>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='password' className='2xl:text-base'>
                  Şifre
                </Label>
                <Link
                  href='#'
                  className='text-sm 2xl:text-base font-medium text-primary hover:underline'
                >
                  Şifremi unuttum?
                </Link>
              </div>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                  }}
                  onBlur={() => {
                    handleBlur('password');
                  }}
                  className={`bg-white border-slate-200 focus:border-primary focus:ring-primary/20 pr-10 2xl:h-12 2xl:text-base ${
                    touched.password && errors.password
                      ? 'border-red-500 focus:border-red-500'
                      : ''
                  }`}
                />
                <button
                  type='button'
                  onClick={() => {
                    setShowPassword(!showPassword);
                  }}
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
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='remember'
                className='border-slate-200 bg-white data-[state=checked]:bg-primary data-[state=checked]:border-primary 2xl:h-5 2xl:w-5'
              />
              <Label
                htmlFor='remember'
                className='text-sm 2xl:text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
              >
                Beni hatırla
              </Label>
            </div>
            <Button
              type='submit'
              className='w-full font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] 2xl:h-12 2xl:text-base'
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 2xl:h-5 2xl:w-5 animate-spin' />
                  Giriş Yapılıyor...
                </>
              ) : (
                <>
                  Giriş Yap
                  <ArrowRight className='ml-2 h-4 w-4 2xl:h-5 2xl:w-5' />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className='flex flex-col space-y-4 text-center text-sm 2xl:text-base text-muted-foreground'>
          {/* Registration link removed as requested */}
        </CardFooter>
      </Card>
    </div>
  );
}
