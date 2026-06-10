import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/antoktonClient';
import { useQuery } from '@tanstack/react-query';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b1020]">
            <div className="max-w-md w-full">
                <div className="text-center space-y-6">
                    {/* 404 Error Code */}
                    <div className="space-y-2">
                        <h1 className="text-7xl font-light text-white/30">404</h1>
                        <div className="h-0.5 w-16 bg-white/20 mx-auto"></div>
                    </div>
                    
                    {/* Main Message */}
                    <div className="space-y-3">
                        <h2 className="text-2xl font-medium text-white">
                            Faqja nuk u gjet
                        </h2>
                        <p className="text-white/65 leading-relaxed">
                            Faqja <span className="font-medium text-white/80">"{pageName}"</span> nuk ekziston ose është zhvendosur.
                        </p>
                    </div>
                    
                    {/* Admin Note */}
                    {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                        <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                </div>
                                <div className="text-left space-y-1">
                                    <p className="text-sm font-medium text-white">Shënim për admin</p>
                                    <p className="text-sm text-white/60 leading-relaxed">
                                        Kontrollo nëse kjo faqe duhet të ekzistojë ose nëse URL-ja duhet të ridrejtohet.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="pt-6 flex flex-wrap justify-center gap-2">
                        {[
                            ['/', 'Kthehu në Kryefaqe'],
                            ['/Feed', 'Punë'],
                            ['/Pazar', 'Pazar'],
                            ['/Statuset', 'Statuset'],
                            ['/Contact', 'Kontakt']
                        ].map(([href, label]) => (
                            <Link
                                key={href}
                                to={href}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-white/10 border border-white/15 rounded-lg hover:bg-white/15 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8ab4ff]"
                            >
                                {label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
