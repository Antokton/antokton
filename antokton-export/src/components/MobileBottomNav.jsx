import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Briefcase, MessageCircle, User } from "lucide-react";

export default function MobileBottomNav({ currentPageName }) {
  const navItems = [
    { name: "Home", page: "Home", icon: Home },
    { name: "Feed", page: "Feed", icon: Briefcase },
    { name: "Messages", page: "Messages", icon: MessageCircle },
    { name: "Profile", page: "Profile", icon: User }
  ];

  const handleNavClick = (e, page) => {
    if (currentPageName === page) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0b1020] border-t border-white/10 z-40 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPageName === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              onClick={(e) => handleNavClick(e, item.page)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                isActive ? "text-[#9bffd6]" : "text-white/60"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}