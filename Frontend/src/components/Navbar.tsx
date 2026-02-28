import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const links = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/meal-plans",   label: "Meal Plans"   },
  { to: "/budget",       label: "Budget"       },
  { to: "/health",       label: "Health"       },
  { to: "/dashboard",   label: "Dashboard"    },
  { to: "/about",        label: "About"        },
];

const Navbar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, isAuthenticated, logout } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate("/");
  };

  const goToHome = () => {
    setProfileOpen(false);
    if (user?._id) navigate(`/home/${user._id}`);
  };

  const goToProfile = () => {
    setProfileOpen(false);
    if (user?._id) navigate(`/profile/${user._id}`);
  };

  // Build initials for avatar
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  // Profile completion hint
  const isProfileComplete = !!(profile?.age && profile?.height && profile?.weight && profile?.activityLevel);

  return (
    <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="font-heading font-bold text-xl text-primary">
          NutriAI 🍛
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link text-sm font-medium transition-colors ${
                location.pathname === l.to
                  ? "text-primary active"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div ref={dropdownRef} style={{ position: "relative" }}>
              {/* Avatar button */}
              <button
                onClick={() => setProfileOpen(o => !o)}
                style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "linear-gradient(135deg, #E8734A, #C4522E)",
                  border: "2px solid rgba(232,115,74,.3)",
                  color: "#fff",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: profileOpen ? "0 4px 18px rgba(232,115,74,.45)" : "0 2px 8px rgba(232,115,74,.2)",
                  transform: profileOpen ? "scale(1.08)" : "scale(1)",
                }}
                title="Edit Profile"
              >
                {initials}
                {/* Red dot if profile incomplete */}
                {!isProfileComplete && (
                  <span style={{
                    position: "absolute", top: -2, right: -2,
                    width: 10, height: 10, borderRadius: "50%",
                    background: "#E8734A",
                    border: "2px solid #fff",
                  }} />
                )}
              </button>

              {/* Dropdown */}
              {profileOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  background: "#fff",
                  borderRadius: 18,
                  boxShadow: "0 12px 48px rgba(92,61,46,.18), 0 0 0 1px rgba(212,168,138,.2)",
                  minWidth: 220,
                  overflow: "hidden",
                  animation: "dropIn 0.2s cubic-bezier(.22,1,.36,1) both",
                  zIndex: 200,
                }}>
                  <style>{`@keyframes dropIn { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>

                  {/* User info header */}
                  <div style={{
                    padding: "16px 18px 12px",
                    borderBottom: "1px solid rgba(212,168,138,.2)",
                    background: "linear-gradient(135deg, rgba(255,245,238,1), rgba(255,235,220,.8))",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "linear-gradient(135deg, #E8734A, #C4522E)",
                        color: "#fff", fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>{initials}</div>
                      <div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: "#3D1F0A" }}>
                          {user?.name}
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8B6855" }}>
                          {user?.email}
                        </div>
                      </div>
                    </div>
                    {!isProfileComplete && (
                      <div style={{
                        marginTop: 10,
                        background: "rgba(232,115,74,.12)",
                        borderRadius: 8, padding: "6px 10px",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#C4522E", fontWeight: 600,
                      }}>
                        ⚡ Complete your profile for better recommendations
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ padding: "8px 0" }}>
                    <button
                      onClick={goToHome}
                      style={{
                        width: "100%", padding: "10px 18px",
                        background: "none", border: "none",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                        color: "#5C3D2E", cursor: "pointer",
                        textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,115,74,.07)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ fontSize: 16 }}>🏠</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>Nutrition Home</div>
                        <div style={{ fontSize: 11, color: "#A07060" }}>AI body analysis & meal lookup</div>
                      </div>
                    </button>

                    <button
                      onClick={goToProfile}
                      style={{
                        width: "100%", padding: "10px 18px",
                        background: "none", border: "none",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                        color: "#5C3D2E", cursor: "pointer",
                        textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(232,115,74,.07)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ fontSize: 16 }}>👤</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>Edit Profile</div>
                        <div style={{ fontSize: 11, color: "#A07060" }}>Update your details & stats</div>
                      </div>
                    </button>

                    <div style={{ margin: "4px 12px", borderTop: "1px solid rgba(212,168,138,.2)" }} />


                    <button
                      onClick={handleLogout}
                      style={{
                        width: "100%", padding: "10px 18px",
                        background: "none", border: "none",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                        color: "#C0392B", cursor: "pointer",
                        textAlign: "left", display: "flex", alignItems: "center", gap: 10,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(220,60,60,.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}
                    >
                      <span style={{ fontSize: 16 }}>🚪</span>
                      <span style={{ fontWeight: 600 }}>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-card border-b border-border px-6 pb-4 space-y-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={`block py-2 text-sm font-medium ${
                location.pathname === l.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <button
                  onClick={() => { goToHome(); setMenuOpen(false); }}
                  className="block py-2 text-sm font-semibold text-primary text-left"
                >
                  🏠 Nutrition Home
                </button>
                <button
                  onClick={() => { goToProfile(); setMenuOpen(false); }}
                  className="block py-2 text-sm font-semibold text-primary text-left"
                >
                  👤 Edit Profile
                </button>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="block py-2 text-sm font-medium text-red-500 text-left"
                >
                  🚪 Logout ({user?.name?.split(" ")[0]})
                </button>
              </>
            ) : (
              <>
                <Link to="/login"  onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground">Login</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-semibold text-primary">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
