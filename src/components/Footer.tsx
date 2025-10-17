import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo ve Açıklama */}
          <div className="col-span-1 md:col-span-1">
            <h2 className="text-xl font-bold mb-4">Yummine</h2>
            <p className="text-gray-400">
              Yummine ile lezzetli yemekleri evinize veya ofisinize getiriyoruz. Türkiye'nin dört bir yanındaki en iyi restoranlar artık parmaklarınızın ucunda.
            </p>
          </div>

          {/* Hızlı Linkler */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">Hızlı Linkler</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-400 hover:text-white transition">Ana Sayfa</Link></li>
              <li><Link href="/shops" className="text-gray-400 hover:text-white transition">Restoranlar</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-white transition">Hakkımızda</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-white transition">İletişim</Link></li>
            </ul>
          </div>

          {/* Yasal */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">Yasal</h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-gray-400 hover:text-white transition">Kullanım Şartları</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-white transition">Gizlilik Politikası</Link></li>
              <li><Link href="/cookies" className="text-gray-400 hover:text-white transition">Çerez Politikası</Link></li>
            </ul>
          </div>

          {/* İletişim */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">İletişim</h3>
            <ul className="space-y-2">
              <li className="flex items-center text-gray-400">
                <span className="mr-2">📍</span> İstanbul, Türkiye
              </li>
              <li className="flex items-center text-gray-400">
                <span className="mr-2">✉️</span> info@yummine.com
              </li>
              <li className="flex items-center text-gray-400">
                <span className="mr-2">📞</span> +90 212 123 45 67
              </li>
            </ul>
          </div>
        </div>

        {/* Alt Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-400">
            &copy; {new Date().getFullYear()} Yummine. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;