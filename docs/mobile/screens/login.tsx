import React, { useState, useEffect } from 'react';

// Mock Localization Data (in a real app, use a library like i18next)
const localizations = {
  en: {
    LOGIN_SCREEN_TITLE: "CoOrder Login",
    EMAIL_LABEL: "Email",
    EMAIL_PLACEHOLDER: "Enter your email",
    PASSWORD_LABEL: "Password",
    PASSWORD_PLACEHOLDER: "Enter your password",
    SUBDOMAIN_LABEL: "Subdomain",
    SUBDOMAIN_PLACEHOLDER: "Enter restaurant subdomain (e.g., mycafe)",
    SIGN_IN: "Sign In",
    FIELD_REQUIRED_ERROR: "This field is required.",
    INVALID_EMAIL_FORMAT: "Please enter a valid email address.",
    LOGIN_FAILED_ALERT_TITLE: "Login Failed",
    INVALID_CREDENTIALS_ERROR: "Invalid email, password, or subdomain. Please check and try again.",
    UNKNOWN_LOGIN_ERROR: "An unexpected error occurred. Please try again.",
    SIGN_IN_DISABLED_HINT: "Please fill in all fields correctly to sign in.",
    LOGGED_IN_WELCOME: "Welcome!",
    LOGGED_IN_SUBDOMAIN: "Subdomain",
    SIGN_OUT: "Sign Out",
    LOADING: "Signing in...",
  },
  ja: {
    LOGIN_SCREEN_TITLE: "ショップコパイロットログイン",
    EMAIL_LABEL: "メールアドレス",
    EMAIL_PLACEHOLDER: "メールアドレスを入力してください",
    PASSWORD_LABEL: "パスワード",
    PASSWORD_PLACEHOLDER: "パスワードを入力してください",
    SUBDOMAIN_LABEL: "サブドメイン",
    SUBDOMAIN_PLACEHOLDER: "レストランのサブドメインを入力 (例: mycafe)",
    SIGN_IN: "サインイン",
    FIELD_REQUIRED_ERROR: "このフィールドは必須です。",
    INVALID_EMAIL_FORMAT: "有効なメールアドレスを入力してください。",
    LOGIN_FAILED_ALERT_TITLE: "ログイン失敗",
    INVALID_CREDENTIALS_ERROR: "メールアドレス、パスワード、またはサブドメインが無効です。確認して再度お試しください。",
    UNKNOWN_LOGIN_ERROR: "予期せぬエラーが発生しました。再度お試しください。",
    SIGN_IN_DISABLED_HINT: "サインインするには、すべてのフィールドを正しく入力してください。",
    LOGGED_IN_WELCOME: "ようこそ！",
    LOGGED_IN_SUBDOMAIN: "サブドメイン",
    SIGN_OUT: "サインアウト",
    LOADING: "サインイン処理中...",
  },
  vi: {
    LOGIN_SCREEN_TITLE: "Đăng nhập CoOrder",
    EMAIL_LABEL: "Email",
    EMAIL_PLACEHOLDER: "Nhập email của bạn",
    PASSWORD_LABEL: "Mật khẩu",
    PASSWORD_PLACEHOLDER: "Nhập mật khẩu của bạn",
    SUBDOMAIN_LABEL: "Tên miền phụ",
    SUBDOMAIN_PLACEHOLDER: "Nhập tên miền phụ nhà hàng (vd: mycafe)",
    SIGN_IN: "Đăng Nhập",
    FIELD_REQUIRED_ERROR: "Trường này là bắt buộc.",
    INVALID_EMAIL_FORMAT: "Vui lòng nhập một địa chỉ email hợp lệ.",
    LOGIN_FAILED_ALERT_TITLE: "Đăng Nhập Thất Bại",
    INVALID_CREDENTIALS_ERROR: "Email, mật khẩu, hoặc tên miền phụ không hợp lệ. Vui lòng kiểm tra và thử lại.",
    UNKNOWN_LOGIN_ERROR: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.",
    SIGN_IN_DISABLED_HINT: "Vui lòng điền chính xác tất cả các trường để đăng nhập.",
    LOGGED_IN_WELCOME: "Chào mừng!",
    LOGGED_IN_SUBDOMAIN: "Tên miền phụ",
    SIGN_OUT: "Đăng xuất",
    LOADING: "Đang đăng nhập...",
  }
};

// Helper to get localized string
const useTranslation = (lang) => {
  return (key) => localizations[lang][key] || key;
};

// Mock Restaurant Settings (would come from context or API in a real app)
const mockRestaurantSettings = {
  mycafe: { brandColor: 'bg-orange-500', hoverBrandColor: 'hover:bg-orange-600', brandColorHex: '#FF9500' },
  sushishop: { brandColor: 'bg-red-600', hoverBrandColor: 'hover:bg-red-700', brandColorHex: '#D82E2E' },
  default: { brandColor: 'bg-blue-600', hoverBrandColor: 'hover:bg-blue-700', brandColorHex: '#007AFF' },
};

const App = () => {
  const [currentLang, setCurrentLang] = useState('en');
  const t = useTranslation(currentLang);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [subdomain, setSubdomain] = useState('');
  const [brandSettings, setBrandSettings] = useState(mockRestaurantSettings.default);

  // Effect to update brand color based on subdomain input (simplified for demo)
  // In a real app, this would likely happen after successful login based on restaurant_id
  useEffect(() => {
    if (subdomain && mockRestaurantSettings[subdomain.toLowerCase()]) {
      setBrandSettings(mockRestaurantSettings[subdomain.toLowerCase()]);
    } else if (subdomain && subdomain.length > 2) { // If subdomain typed but not a preset one
        setBrandSettings(mockRestaurantSettings.default); // Fallback
    } else {
        setBrandSettings(mockRestaurantSettings.default); // Default if empty
    }
  }, [subdomain]);


  const handleLogin = async (email, password, currentSubdomain) => {
    setIsLoading(true);
    setAuthError(null);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (email.includes('@') && password.length > 0 && currentSubdomain.length > 0) {
      // Simulate successful login
      // In a real app, you'd get JWT, restaurant_id, role from Supabase
      // And then fetch brand color based on restaurant_id
      console.log("Login successful for:", email, "Subdomain:", currentSubdomain);
      setIsAuthenticated(true);
      setSubdomain(currentSubdomain); // Keep subdomain for display
      // Update brand settings based on the *actual* restaurant data post-login
      // For this mock, we'll assume the subdomain typed is the one we use for branding
      if (mockRestaurantSettings[currentSubdomain.toLowerCase()]) {
        setBrandSettings(mockRestaurantSettings[currentSubdomain.toLowerCase()]);
      } else {
        setBrandSettings(mockRestaurantSettings.default);
      }
    } else {
      // Simulate failed login
      setAuthError(t('INVALID_CREDENTIALS_ERROR'));
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSubdomain('');
    setAuthError(null);
    setBrandSettings(mockRestaurantSettings.default); // Reset brand
  };

  if (isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-slate-100`}>
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-6" style={{color: brandSettings.brandColorHex}}>{t('LOGGED_IN_WELCOME')}</h1>
          <p className="text-slate-700 mb-2">{t('EMAIL_LABEL')}: <span className="font-medium">mockuser@example.com</span></p>
          <p className="text-slate-700 mb-6">{t('LOGGED_IN_SUBDOMAIN')}: <span className="font-medium">{subdomain}</span></p>
          <button
            onClick={handleLogout}
            className={`w-full ${brandSettings.brandColor} ${brandSettings.hoverBrandColor} text-white font-semibold py-3 px-4 rounded-xl transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2`}
            style={{backgroundColor: brandSettings.brandColorHex}}
          >
            {t('SIGN_OUT')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans bg-slate-100">
      <div className="absolute top-4 right-4">
        <select
          value={currentLang}
          onChange={(e) => setCurrentLang(e.target.value)}
          className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 shadow-sm"
        >
          <option value="en">English</option>
          <option value="ja">日本語</option>
          <option value="vi">Tiếng Việt</option>
        </select>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-2xl md:text-3xl font-bold text-center text-slate-800 mb-8">
          {t('LOGIN_SCREEN_TITLE')}
        </h1>

        {authError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md" role="alert">
            <p className="font-bold">{t('LOGIN_FAILED_ALERT_TITLE')}</p>
            <p>{authError}</p>
          </div>
        )}

        <LoginForm
          t={t}
          onLogin={handleLogin}
          isLoading={isLoading}
          brandColor={brandSettings.brandColor}
          hoverBrandColor={brandSettings.hoverBrandColor}
          brandColorHex={brandSettings.brandColorHex}
          subdomain={subdomain} // Pass subdomain to LoginForm
          setSubdomain={setSubdomain} // Pass setter to allow LoginForm to update it for brand color preview
        />
      </div>
       <footer className="text-center mt-8 text-slate-500 text-sm">
          CoOrder &copy; 2025. All rights reserved.
        </footer>
    </div>
  );
};

const LoginForm = ({ t, onLogin, isLoading, brandColor, hoverBrandColor, brandColorHex, subdomain, setSubdomain: setParentSubdomain }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Subdomain state is now managed by App, but LoginForm can update it via setParentSubdomain

  const [errors, setErrors] = useState({});

  const isValidEmail = (email) => /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,64}$/i.test(email);

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = t('FIELD_REQUIRED_ERROR');
    else if (!isValidEmail(email)) newErrors.email = t('INVALID_EMAIL_FORMAT');
    if (!password) newErrors.password = t('FIELD_REQUIRED_ERROR');
    if (!subdomain) newErrors.subdomain = t('FIELD_REQUIRED_ERROR');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onLogin(email, password, subdomain);
    }
  };

  const handleSubdomainChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/\s+/g, '');
    setParentSubdomain(value); // Update parent's subdomain state
  };


  const isButtonDisabled = !email || !password || !subdomain || isLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
          {t('EMAIL_LABEL')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('EMAIL_PLACEHOLDER')}
          className={`appearance-none block w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-slate-300'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 ${errors.email ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} sm:text-sm transition duration-150`}
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          {t('PASSWORD_LABEL')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('PASSWORD_PLACEHOLDER')}
          className={`appearance-none block w-full px-4 py-3 border ${errors.password ? 'border-red-500' : 'border-slate-300'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 ${errors.password ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} sm:text-sm transition duration-150`}
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="subdomain" className="block text-sm font-medium text-slate-700 mb-1">
          {t('SUBDOMAIN_LABEL')}
        </label>
        <input
          id="subdomain"
          name="subdomain"
          type="text"
          value={subdomain}
          onChange={handleSubdomainChange}
          placeholder={t('SUBDOMAIN_PLACEHOLDER')}
          className={`appearance-none block w-full px-4 py-3 border ${errors.subdomain ? 'border-red-500' : 'border-slate-300'} rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 ${errors.subdomain ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-blue-500 focus:border-blue-500'} sm:text-sm transition duration-150`}
        />
        {errors.subdomain && <p className="mt-1 text-xs text-red-600">{errors.subdomain}</p>}
      </div>

      <div>
        <button
          type="submit"
          disabled={isButtonDisabled}
          className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-semibold text-white ${
            isButtonDisabled ? 'bg-slate-400 cursor-not-allowed' : `${brandColor} ${hoverBrandColor}`
          } focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-150 ease-in-out`}
          style={!isButtonDisabled ? {backgroundColor: brandColorHex} : {}}
          title={isButtonDisabled ? t('SIGN_IN_DISABLED_HINT') : ''}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('LOADING')}
            </>
          ) : (
            t('SIGN_IN')
          )}
        </button>
      </div>
    </form>
  );
};

export default App;
