/**
 * NutriAI — Homepage (Index.tsx)
 *
 * ✅ Peach / warm-orange background PRESERVED
 * ✅ Feature cards: STRAIGHT (no rotation), sticky note style
 * ✅ Images POP OUT above the card boundary — no pins
 * ✅ Lined notecard body style
 * ✅ Plate shows SPLIT VIEW: Junk food LEFT | Healthy alternative RIGHT
 * ✅ Smooth auto-gliding carousel — no arrows
 * ✅ Ticker/marquee bar REMOVED
 */

import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import rajma            from "@/assets/rajma.jpg";
import paneer           from "@/assets/paneer.jpg";
import egg              from "@/assets/egg.jpg";
import dal              from "@/assets/dal.jpg";
import illNutrition     from "@/assets/ill-nutrition.png";
import illBudget        from "@/assets/ill-budget.png";
import illSmartPlanning from "@/assets/ill-smart-planning.png";

/* ─── Junk ↔ Healthy pairs ─── */
const pairs = [
  {
    junk:    { name:"Burger",   cal:"650 kcal", emoji:"🍔", image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
    healthy: { name:"Rajma Chawal",  cal:"480 kcal", protein:"18g", price:"₹40", tag:"High Protein", image:rajma  },
  },
  {
    junk:    { name:"Samosa",   cal:"400 kcal", emoji:"🥟", image:"https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80" },
    healthy: { name:"Paneer Bhurji", cal:"390 kcal", protein:"22g", price:"₹60", tag:"Vegetarian",  image:paneer },
  },
  {
    junk:    { name:"Vada Pav", cal:"320 kcal", emoji:"🫓", image:"https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80" },
    healthy: { name:"Egg Curry",     cal:"320 kcal", protein:"26g", price:"₹45", tag:"Best Value",  image:egg    },
  },
  {
    junk:    { name:"Pizza",    cal:"800 kcal", emoji:"🍕", image:"https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80" },
    healthy: { name:"Dal Rice",      cal:"410 kcal", protein:"14g", price:"₹30", tag:"Budget Pick", image:dal    },
  },
];

const healthyMeals = pairs.map(p => p.healthy);

const NAV_LINKS = [
  { label:"How It Works", href:"/how-it-works" },
  { label:"Meal Plans",   href:"/meal-plans"   },
  { label:"Budget",       href:"/budget"       },
  { label:"Health",       href:"/health"       },
  { label:"Dashboard",    href:"/dashboard"    },
  { label:"About",        href:"/about"        },
];

/* ─── Feature cards — straight sticky note style ─── */
const featCards = [
  {
    cardBg:       "linear-gradient(135deg, #FFB088 0%, #FFCBA4 50%, #FFD4B8 100%)",
    imgBg:        "linear-gradient(135deg, #FFA070 0%, #FFBB90 50%, #FFCFAD 100%)",
    accent:       "#7A2D10",
    dotColor:     "#C4522E",
    illustration: illNutrition,
    illAlt:       "Balanced nutrition illustration",
    title:        "Balanced Nutrition",
    items:        ["Perfect protein-to-calorie ratio","Smart macro tracking","Daily health targets"],
    stat:         "52g",
    statLabel:    "avg. protein",
    href:         "/health",
  },
  {
    cardBg:       "linear-gradient(135deg, #FFCBA4 0%, #FFD8B8 50%, #FFE8D5 100%)",
    imgBg:        "linear-gradient(135deg, #FFBF95 0%, #FFD0AE 50%, #FFE2CC 100%)",
    accent:       "#6B2A0E",
    dotColor:     "#E8734A",
    illustration: illBudget,
    illAlt:       "Budget friendly wallet illustration",
    title:        "Budget Friendly",
    items:        ["All meals under ₹60","Hostel-friendly ingredients","Zero compromise on taste"],
    stat:         "₹80",
    statLabel:    "avg. daily cost",
    href:         "/budget",
  },
  {
    cardBg:       "linear-gradient(135deg, #FFD4B0 0%, #FFBF95 50%, #FFAD80 100%)",
    imgBg:        "linear-gradient(135deg, #FFE2CC 0%, #FFD0B5 50%, #FFBC98 100%)",
    accent:       "#3D1F0A",
    dotColor:     "#8B2E0F",
    illustration: illSmartPlanning,
    illAlt:       "Smart planning illustration",
    title:        "Smart Planning",
    items:        ["AI-personalized weekly plans","Dietary preference support","Auto-adjusts to your goals"],
    stat:         "100%",
    statLabel:    "personalized",
    href:         "/meal-plans",
  },
];

export default function Index() {
  const navigate = useNavigate();

  const [cur,       setCur]       = useState(0);
  const [prev,      setPrev]      = useState<number|null>(null);
  const [animating, setAnimating] = useState(false);
  const [dir,       setDir]       = useState<"left"|"right">("left");
  const curRef   = useRef(cur);
  const animRef  = useRef(animating);
  curRef.current  = cur;
  animRef.current = animating;

  const [scrollY,  setScrollY]  = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const advance = useCallback(() => {
    if (animRef.current) return;
    const next = (curRef.current + 1) % pairs.length;
    setAnimating(true); setDir("left"); setPrev(curRef.current); setCur(next);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 800);
  }, []);

  useEffect(() => { const id = setInterval(advance, 4000); return () => clearInterval(id); }, [advance]);

  const jumpTo = useCallback((i: number) => {
    if (animRef.current || i === curRef.current) return;
    setDir(i > curRef.current ? "left" : "right");
    setAnimating(true); setPrev(curRef.current); setCur(i);
    setTimeout(() => { setPrev(null); setAnimating(false); }, 800);
  }, []);

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const goToMeals = () => document.getElementById("meals")?.scrollIntoView({ behavior:"smooth" });
  const pair = pairs[cur];

  const renderPair = (pairData: typeof pairs[0], keyPrefix: string, showLabels: boolean) => (
    <>
      <div style={{ position:"absolute", top:0, left:0, width:"50%", height:"100%", overflow:"hidden" }}>
        <img src={pairData.junk.image} crossOrigin="anonymous" alt={pairData.junk.name}
          style={{ position:"absolute", top:0, left:0, width:"200%", height:"100%", objectFit:"cover", objectPosition:"center" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(60,8,8,.15) 0%,transparent 30%,rgba(40,4,4,.88) 100%)", pointerEvents:"none" }}/>
        {showLabels && <>
          <div key={`${keyPrefix}-jtag`} style={{ position:"absolute", top:22, left:10, background:"rgba(180,20,20,.88)", backdropFilter:"blur(6px)", color:"#fff", padding:"4px 10px", borderRadius:14, fontSize:9, fontFamily:"'DM Sans',sans-serif", fontWeight:700, letterSpacing:.8, textTransform:"uppercase", animation:"tagPop .5s .2s cubic-bezier(.22,1,.36,1) both" }}>❌ Junk</div>
          <div key={`${keyPrefix}-jlabel`} style={{ position:"absolute", bottom:48, left:0, right:0, textAlign:"center", padding:"10px 6px", animation:"labelUp .6s .45s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ fontSize:18, marginBottom:3 }}>{pairData.junk.emoji}</div>
            <div className="dm" style={{ color:"#fff", fontWeight:700, fontSize:11, textShadow:"0 1px 8px rgba(0,0,0,.9)", textDecoration:"line-through", opacity:.9 }}>{pairData.junk.name}</div>
            <div style={{ display:"inline-block", marginTop:5, background:"rgba(180,20,20,.82)", backdropFilter:"blur(4px)", color:"#FFAAAA", padding:"3px 10px", borderRadius:20, fontSize:11, fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>{pairData.junk.cal}</div>
          </div>
        </>}
      </div>

      <div style={{ position:"absolute", top:0, right:0, width:"50%", height:"100%", overflow:"hidden" }}>
        <img src={pairData.healthy.image} alt={pairData.healthy.name}
          style={{ position:"absolute", top:0, right:0, width:"200%", height:"100%", objectFit:"cover", objectPosition:"center" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(8,40,16,.15) 0%,transparent 30%,rgba(5,28,12,.88) 100%)", pointerEvents:"none" }}/>
        {showLabels && <>
          <div key={`${keyPrefix}-htag`} style={{ position:"absolute", top:22, right:10, background:"linear-gradient(135deg,#2E7D52,#1a5c38)", color:"#fff", padding:"4px 10px", borderRadius:14, fontSize:9, fontFamily:"'DM Sans',sans-serif", fontWeight:700, letterSpacing:.8, textTransform:"uppercase", animation:"tagPop .5s .25s cubic-bezier(.22,1,.36,1) both" }}>✅ {pairData.healthy.tag}</div>
          <div key={`${keyPrefix}-hlabel`} style={{ position:"absolute", bottom:48, left:0, right:0, textAlign:"center", padding:"10px 6px", animation:"labelUp .6s .5s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ fontSize:18, marginBottom:3 }}>✅</div>
            <div className="dm" style={{ color:"#fff", fontWeight:700, fontSize:11, textShadow:"0 1px 8px rgba(0,0,0,.9)" }}>{pairData.healthy.name}</div>
            <div style={{ display:"inline-block", marginTop:5, background:"rgba(20,80,40,.82)", backdropFilter:"blur(4px)", color:"#B8FFD4", padding:"3px 10px", borderRadius:20, fontSize:11, fontFamily:"'DM Sans',sans-serif", fontWeight:700 }}>{pairData.healthy.cal} · {pairData.healthy.protein}</div>
          </div>
        </>}
      </div>

      <div className="splitLine"/>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:42, height:42, borderRadius:"50%", background:"linear-gradient(135deg,#E8734A,#C4522E)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:800, color:"#fff", boxShadow:"0 4px 20px rgba(0,0,0,.4), 0 0 0 3px rgba(255,255,255,.6)", zIndex:20, animation:"vsPulse 2.5s ease-in-out infinite" }}>VS</div>
    </>
  );

  return (
    <div style={{ fontFamily:"'Playfair Display',serif", background:"#FFF5EE", overflowX:"hidden", minHeight:"100vh" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{overflow-x:hidden}
        .dm{font-family:'DM Sans',sans-serif}

        @keyframes pairEnterL{0%{transform:translateX(110%) scale(.9);opacity:0;filter:blur(6px)}55%{opacity:1;filter:blur(0)}100%{transform:translateX(0) scale(1);opacity:1;filter:blur(0)}}
        @keyframes pairExitL{0%{transform:translateX(0) scale(1);opacity:1}100%{transform:translateX(-110%) scale(.9);opacity:0;filter:blur(6px)}}
        @keyframes pairEnterR{0%{transform:translateX(-110%) scale(.9);opacity:0;filter:blur(6px)}55%{opacity:1;filter:blur(0)}100%{transform:translateX(0) scale(1);opacity:1;filter:blur(0)}}
        @keyframes pairExitR{0%{transform:translateX(0) scale(1);opacity:1}100%{transform:translateX(110%) scale(.9);opacity:0;filter:blur(6px)}}

        @keyframes labelUp  {from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes vsPulse  {0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}
        @keyframes tagPop   {0%{transform:scale(.7);opacity:0}65%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
        @keyframes float1   {0%,100%{transform:translateY(0)}50%{transform:translateY(-18px) rotate(5deg)}}
        @keyframes float2   {0%,100%{transform:translateY(0)}50%{transform:translateY(-12px) rotate(-8deg)}}
        @keyframes float3   {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px) rotate(-5deg)}}
        @keyframes blob     {0%,100%{border-radius:60% 40% 55% 45%/50% 60% 40% 50%}33%{border-radius:45% 55% 40% 60%/60% 40% 55% 45%}66%{border-radius:55% 45% 60% 40%/45% 55% 50% 50%}}
        @keyframes spinRing {from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulsering{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.06);opacity:1}}
        @keyframes heroIn   {from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}

        .fa{animation:float1 5.5s ease-in-out infinite}
        .fb{animation:float2 4.2s ease-in-out infinite .7s}
        .fc{animation:float3 6.3s ease-in-out infinite 1.4s}
        .heroBlob{animation:blob 8s ease-in-out infinite}
        .plateRing{animation:pulsering 3s ease-in-out infinite}
        .spinRing{animation:spinRing 24s linear infinite}

        .navLink{font-family:'DM Sans',sans-serif;font-size:15px;color:#5C3D2E;text-decoration:none;font-weight:500;position:relative;padding-bottom:2px;transition:color .2s;background:none;border:none;cursor:pointer}
        .navLink::after{content:'';position:absolute;bottom:0;left:0;width:0;height:2px;background:#E8734A;transition:width .3s;border-radius:2px}
        .navLink:hover{color:#E8734A}
        .navLink:hover::after{width:100%}

        .btnPrimary{background:#E8734A;color:#fff;border:none;padding:14px 30px;border-radius:60px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .3s;box-shadow:0 8px 28px rgba(232,115,74,.4);text-decoration:none;display:inline-block}
        .btnPrimary:hover{transform:translateY(-3px);box-shadow:0 14px 40px rgba(232,115,74,.5);background:#d4623a}
        .btnWhite{background:#fff;color:#E8734A;border:none;padding:16px 36px;border-radius:60px;font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;cursor:pointer;transition:all .3s;box-shadow:0 8px 28px rgba(0,0,0,.2);text-decoration:none;display:inline-block}
        .btnWhite:hover{transform:translateY(-3px);box-shadow:0 14px 40px rgba(0,0,0,.25)}
        .btnGhost{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.45);padding:14px 34px;border-radius:60px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:all .3s;text-decoration:none;display:inline-block}
        .btnGhost:hover{border-color:#fff;background:rgba(255,255,255,.1);transform:translateY(-2px)}
        .btnOutline{background:transparent;color:#5C3D2E;border:2px solid #D4A88A;padding:11px 26px;border-radius:60px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all .3s;text-decoration:none;display:inline-block}
        .btnOutline:hover{border-color:#E8734A;color:#E8734A;transform:translateY(-2px)}

        .mealCard{background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 4px 24px rgba(92,61,46,.08);transition:all .4s cubic-bezier(.22,1,.36,1);cursor:pointer}
        .mealCard:hover{transform:translateY(-12px) scale(1.02);box-shadow:0 20px 60px rgba(232,115,74,.2)}
        .mealCard:hover .mealImg{transform:scale(1.07)}
        .mealImg{transition:transform .4s ease}

        .statPill{display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:15px 22px;min-width:86px}
        .addBtn{background:#E8734A;color:#fff;border:none;width:40px;height:40px;border-radius:50%;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;box-shadow:0 4px 14px rgba(232,115,74,.4);flex-shrink:0}
        .addBtn:hover{transform:scale(1.15) rotate(90deg)}
        .ftrLink{display:block;color:rgba(255,200,170,.65);text-decoration:none;font-family:'DM Sans',sans-serif;font-size:14px;margin-bottom:12px;transition:color .2s}
        .ftrLink:hover{color:#FFD4B8}

        .dot{height:8px;border-radius:4px;background:rgba(255,255,255,.38);border:none;cursor:pointer;padding:0;transition:all .4s cubic-bezier(.22,1,.36,1)}
        .dot.active{background:#fff;box-shadow:0 0 14px rgba(255,255,255,.6)}

        .splitLine{position:absolute;top:0;bottom:0;left:50%;width:2px;background:linear-gradient(to bottom,transparent,rgba(255,255,255,.9),rgba(255,220,180,.7),rgba(255,255,255,.9),transparent);z-index:15;transform:translateX(-50%);box-shadow:0 0 12px 3px rgba(255,200,150,.5)}
        .plateCircle{border-radius:50%;overflow:hidden;position:relative}

        /* ═══ STICKY NOTE CARD STYLES ═══ */
        .stickyOuter {
          position: relative;
          padding-top: 100px;
          text-decoration: none;
          display: block;
          transition: transform .35s cubic-bezier(.22,1,.36,1);
        }

        .stickyOuter:hover {
          transform: translateY(-8px);
        }

        .stickyCard {
          border-radius: 16px;
          overflow: visible;
          box-shadow:
            0 10px 40px rgba(139,58,31,.14),
            0 2px 8px rgba(139,58,31,.08),
            inset 0 1px 0 rgba(255,255,255,.6);
          position: relative;
          background: var(--card-bg);
        }

        .noteLines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          border-radius: 16px;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 27px,
            rgba(139,58,31,.06) 28px
          );
          background-position: 0 56px;
        }

        .stickyImgWrap {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 24px);
          height: 220px;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 14px 36px rgba(0,0,0,.15), 0 4px 10px rgba(0,0,0,.10);
          z-index: 10;
          margin-top: -4px;
          background: var(--img-bg, linear-gradient(145deg,#FFD4B0,#FFB085));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stickyImg {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center center;
          display: block;
          transition: transform .5s cubic-bezier(.22,1,.36,1);
        }
        .stickyOuter:hover .stickyImg {
          transform: scale(1.04);
        }

        .stickyBody {
          padding: 130px 24px 28px;
          position: relative;
          z-index: 1;
        }

        .threeDots {
          display: flex;
          gap: 5px;
          margin-bottom: 14px;
        }

        @media(max-width:900px){
          .heroGrid{flex-direction:column !important;padding:80px 24px 60px !important}
          .heroRight{width:100% !important;max-width:440px;margin:64px auto 0}
          .heroPlate{width:320px !important;height:320px !important}
          .mealGrid{grid-template-columns:repeat(2,1fr) !important}
          .featGrid{grid-template-columns:1fr !important}
          .ctaInner{flex-direction:column !important;text-align:center}
          .desktopLinks{display:none !important}
          .hamburger{display:flex !important}
        }
        @media(min-width:901px){.hamburger{display:none !important}.mobileMenu{display:none !important}}
        @media(max-width:600px){.mealGrid{grid-template-columns:1fr !important}.statsRow{flex-wrap:wrap;gap:10px !important}.heroBtns{flex-wrap:wrap}}
      `}</style>

      {/* ═══════ NAVBAR ═══════ */}
      <nav style={{
        position:"fixed",top:0,left:0,right:0,zIndex:1000,
        background:scrollY>50?"rgba(255,245,238,.97)":"transparent",
        backdropFilter:scrollY>50?"blur(18px)":"none",
        boxShadow:scrollY>50?"0 2px 30px rgba(92,61,46,.1)":"none",
        transition:"all .4s",padding:"0 40px",
        display:"flex",alignItems:"center",justifyContent:"space-between",height:70,
      }}>
        <Link to="/" style={{ textDecoration:"none",display:"flex",alignItems:"center",gap:10,zIndex:10 }}>
          <div style={{ width:38,height:38,background:"linear-gradient(135deg,#E8734A,#C4522E)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 4px 14px rgba(232,115,74,.4)",flexShrink:0 }}>🍛</div>
          <span style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:700,color:"#3D1F0A",letterSpacing:"-0.5px" }}>NutriAI</span>
        </Link>
        <div className="desktopLinks" style={{ display:"flex",gap:30,alignItems:"center" }}>
          {NAV_LINKS.map(({ label, href }) => <Link key={label} to={href} className="navLink">{label}</Link>)}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <Link to="/login" className="btnPrimary" style={{ padding:"10px 22px",fontSize:14 }}>Get Started</Link>
          <button className="hamburger" onClick={() => setMenuOpen(o=>!o)}
            style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",gap:5,padding:6 }} aria-label="Menu">
            {[0,1,2].map(i=>(
              <span key={i} style={{ display:"block",width:24,height:2,background:"#5C3D2E",borderRadius:2,transition:"all .3s",
                transform:menuOpen?(i===0?"rotate(45deg) translate(5px,5px)":i===2?"rotate(-45deg) translate(5px,-5px)":"scaleX(0)"):"none" }}/>
            ))}
          </button>
        </div>
        <div className="mobileMenu" style={{
          position:"fixed",top:70,left:0,right:0,
          background:"rgba(255,245,238,.98)",backdropFilter:"blur(18px)",
          padding:menuOpen?"22px 40px 28px":"0 40px",
          maxHeight:menuOpen?400:0,overflow:"hidden",
          transition:"all .35s cubic-bezier(.22,1,.36,1)",
          boxShadow:menuOpen?"0 20px 40px rgba(92,61,46,.1)":"none",zIndex:999,
        }}>
          {NAV_LINKS.map(({ label, href }) => (
            <Link key={label} to={href} onClick={()=>setMenuOpen(false)}
              style={{ display:"block",padding:"14px 0",fontFamily:"'DM Sans',sans-serif",fontSize:17,fontWeight:500,color:"#5C3D2E",textDecoration:"none",borderBottom:"1px solid rgba(212,168,138,.2)" }}>{label}</Link>
          ))}
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section style={{
        minHeight:"100vh",
        background:"linear-gradient(145deg,#FF8C5A 0%,#E8734A 35%,#C4522E 70%,#8B2E0F 100%)",
        position:"relative",display:"flex",alignItems:"center",
        overflow:"hidden",paddingTop:70,
      }}>
        <div className="heroBlob" style={{ position:"absolute",width:560,height:560,top:-110,right:-90,background:"rgba(255,200,150,.18)",borderRadius:"60% 40% 55% 45%/50% 60% 40% 50%",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",width:360,height:360,bottom:-80,left:-50,background:"rgba(255,220,180,.12)",borderRadius:"60% 40% 55% 45%/50% 60% 40% 50%",animation:"blob 10s ease-in-out infinite 2s",pointerEvents:"none" }}/>
        {[{top:"14%",left:"9%",s:8},{top:"72%",left:"14%",s:5},{top:"22%",right:"13%",s:10},{top:"80%",right:"18%",s:6}].map((d,i)=>(
          <div key={i} style={{ position:"absolute",width:d.s,height:d.s,borderRadius:"50%",background:"rgba(255,255,255,.32)",pointerEvents:"none",...d }}/>
        ))}

        <div className="heroGrid" style={{ display:"flex",alignItems:"center",width:"100%",maxWidth:1200,margin:"0 auto",padding:"60px 48px",gap:56 }}>
          <div style={{ flex:1,minWidth:0,animation:"heroIn .9s cubic-bezier(.22,1,.36,1) both" }}>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.18)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.3)",borderRadius:30,padding:"8px 18px",marginBottom:28 }}>
              <span style={{ fontSize:15 }}>🍃</span>
              <span className="dm" style={{ fontSize:12,color:"#fff",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase" }}>Craving Junk? Swap it.</span>
            </div>
            <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:"clamp(44px,5.2vw,74px)",fontWeight:900,color:"#fff",lineHeight:1.05,marginBottom:18,letterSpacing:"-2px" }}>
              Craving <span style={{ fontStyle:"italic",color:"#FFD4B8" }}>Junk?</span><br/>
              Eat <span style={{ fontStyle:"italic",color:"#FFD4B8" }}>Smart</span> instead.
            </h1>
            <div key={`pair-label-${cur}`} style={{ animation:"labelUp .5s cubic-bezier(.22,1,.36,1) both" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,background:"rgba(255,255,255,.12)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.2)",borderRadius:16,padding:"12px 18px" }}>
                <span style={{ fontSize:22 }}>{pair.junk.emoji}</span>
                <div>
                  <div className="dm" style={{ color:"rgba(255,200,150,.7)",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase",textDecoration:"line-through" }}>{pair.junk.name} — {pair.junk.cal}</div>
                  <div className="dm" style={{ color:"#fff",fontSize:13,fontWeight:600,marginTop:2 }}>vs {pair.healthy.name} — {pair.healthy.cal} · {pair.healthy.protein} protein 💪</div>
                </div>
              </div>
            </div>
            <p className="dm" style={{ fontSize:17,color:"rgba(255,230,210,.9)",lineHeight:1.75,maxWidth:400,marginBottom:40 }}>
              AI-crafted Indian hostel meals that satisfy your cravings, hit your protein goals — and cost under&nbsp;<strong style={{ color:"#FFD4B8" }}>₹60</strong>. Not kidding.
            </p>
            <div className="statsRow" style={{ display:"flex",gap:14,marginBottom:44 }}>
              {[{v:"52g",l:"Protein"},{v:"₹40",l:"Avg. Cost"},{v:"4.8★",l:"Rating"}].map(s=>(
                <div key={s.l} className="statPill">
                  <span style={{ fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:"#fff",lineHeight:1 }}>{s.v}</span>
                  <span className="dm" style={{ fontSize:11,color:"rgba(255,220,200,.85)",marginTop:4,fontWeight:500 }}>{s.l}</span>
                </div>
              ))}
            </div>
            <div className="heroBtns" style={{ display:"flex",gap:14 }}>
              <Link to="/login" className="btnWhite">Get My Meal Plan →</Link>
              <button onClick={goToMeals} className="btnGhost">View Menu</button>
            </div>
          </div>

          <div className="heroRight" style={{ width:480,position:"relative",flexShrink:0,animation:"heroIn 1s .18s cubic-bezier(.22,1,.36,1) both" }}>
            <div className="spinRing" style={{ position:"absolute",inset:-52,borderRadius:"50%",border:"1px dashed rgba(255,255,255,.18)",pointerEvents:"none" }}>
              {["🍔","🥗","🌶️","💚"].map((ic,i)=>(
                <span key={i} style={{ position:"absolute",fontSize:16,top:"50%",left:"50%",transform:`rotate(${i*90}deg) translateY(-115%) rotate(-${i*90}deg)`,marginTop:-12,marginLeft:-12 }}>{ic}</span>
              ))}
            </div>
            <div className="plateRing" style={{ position:"absolute",inset:-20,borderRadius:"50%",border:"2px dashed rgba(255,255,255,.26)",pointerEvents:"none" }}/>
            <div className="heroPlate plateCircle" style={{ width:430,height:430,border:"5px solid rgba(255,255,255,.35)",boxShadow:"0 30px 80px rgba(0,0,0,.32), 0 0 0 18px rgba(255,255,255,.07)",margin:"0 auto" }}>
              <div key={`cur-${cur}`} style={{ position:"absolute",inset:0,animation:`${dir==="left"?"pairEnterL":"pairEnterR"} .8s cubic-bezier(.22,1,.36,1) both`,zIndex:3 }}>
                {renderPair(pair,`cur-${cur}`,true)}
              </div>
              {prev !== null && (
                <div key={`prev-${prev}`} style={{ position:"absolute",inset:0,animation:`${dir==="left"?"pairExitL":"pairExitR"} .8s cubic-bezier(.22,1,.36,1) both`,zIndex:2,pointerEvents:"none" }}>
                  {renderPair(pairs[prev],`prev-${prev}`,false)}
                </div>
              )}
            </div>
            {[
              { cls:"fa",pos:{ top:20,right:-34 },sz:72,off:1 },
              { cls:"fb",pos:{ bottom:40,right:-44 },sz:58,off:2 },
              { cls:"fc",pos:{ bottom:-8,left:26 },sz:52,off:3 },
            ].map(({ cls,pos,sz,off }) => {
              const p = pairs[(cur+off)%pairs.length];
              return (
                <div key={`thumb-${cur}-${off}`} className={cls} onClick={()=>jumpTo((cur+off)%pairs.length)}
                  style={{ position:"absolute",...pos,width:sz,height:sz,borderRadius:"50%",overflow:"hidden",border:"3px solid rgba(255,255,255,.88)",boxShadow:"0 10px 28px rgba(0,0,0,.3)",cursor:"pointer" }}>
                  <img src={p.healthy.image} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  <div style={{ position:"absolute",top:2,left:2,fontSize:12,textShadow:"0 1px 4px rgba(0,0,0,.8)" }}>{p.junk.emoji}</div>
                </div>
              );
            })}
            <div style={{ position:"absolute",bottom:-54,left:"50%",transform:"translateX(-50%)",display:"flex",gap:8,alignItems:"center" }}>
              {pairs.map((p,i)=>(
                <button key={i} className={`dot${i===cur?" active":""}`} onClick={()=>jumpTo(i)} style={{ width:i===cur?28:8 }} title={`${p.junk.name} vs ${p.healthy.name}`}/>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position:"absolute",bottom:-2,left:0,right:0,pointerEvents:"none" }}>
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ display:"block",width:"100%",height:80 }}>
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,45 L1440,80 L0,80 Z" fill="#FFF5EE"/>
          </svg>
        </div>
      </section>

      {/* ═══════ FEATURES — STICKY NOTE STYLE ═══════ */}
      <section style={{ padding:"110px 48px 160px",background:"linear-gradient(160deg,#FFF4EE 0%,#FFE8D5 40%,#FFD8C0 100%)",position:"relative" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",position:"relative" }}>

          <div style={{ position:"absolute",width:260,height:260,background:"linear-gradient(135deg,#FFD4B8,#FFBA94)",borderRadius:"60% 40% 55% 45%/50% 60% 40% 50%",top:0,right:-30,opacity:.18,animation:"blob 10s ease-in-out infinite",pointerEvents:"none" }}/>

          <div style={{ textAlign:"center",marginBottom:100 }}>
            <span className="dm" style={{ fontSize:12,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:"#E8734A",display:"block",marginBottom:14 }}>Why NutriAI</span>
            <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"clamp(34px,4vw,52px)",fontWeight:900,color:"#3D1F0A",letterSpacing:"-1.5px",lineHeight:1.1 }}>
              Smart meals for<br/><span style={{ color:"#E8734A",fontStyle:"italic" }}>smarter students</span>
            </h2>
          </div>

          <div className="featGrid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:40, alignItems:"end", paddingTop:60 }}>
            {featCards.map((f, i) => (
              <Link key={f.title} to={f.href} className="stickyOuter">
                <div className="stickyImgWrap" style={{ background: f.imgBg }}>
                  <img src={f.illustration} alt={f.illAlt} className="stickyImg"/>
                </div>
                <div className="stickyCard" style={{ background: f.cardBg }}>
                  <div className="noteLines"/>
                  <div className="stickyBody">
                    <div className="threeDots">
                      {[1, 0.5, 0.22].map((op, j) => (
                        <div key={j} style={{ width:7, height:7, borderRadius:"50%", background:f.dotColor, opacity:op }}/>
                      ))}
                    </div>
                    <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:900, color:f.accent, marginBottom:14, letterSpacing:"-0.3px" }}>
                      {f.title}
                    </h3>
                    <div style={{ width:"100%", height:1, background:`linear-gradient(to right,${f.dotColor}66,transparent)`, marginBottom:16 }}/>
                    <div style={{ marginBottom:22 }}>
                      {f.items.map((item, idx) => (
                        <div key={idx} className="dm" style={{ fontSize:13, color:f.accent, marginBottom:9, display:"flex", alignItems:"flex-start", gap:9, opacity:.84 }}>
                          <span style={{ width:6, height:6, borderRadius:"50%", background:f.dotColor, flexShrink:0, display:"inline-block", marginTop:5 }}/>
                          {item}
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop:`2px dashed ${f.dotColor}44`, paddingTop:18, display:"flex", alignItems:"baseline", gap:7 }}>
                      <span style={{ fontFamily:"'Playfair Display',serif", fontSize:46, fontWeight:900, color:f.accent, lineHeight:1 }}>{f.stat}</span>
                      <span className="dm" style={{ fontSize:13, color:f.accent, fontWeight:500, opacity:.68, marginBottom:2 }}>{f.statLabel}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ MEALS GRID ═══════ */}
      <section id="meals" style={{ background:"linear-gradient(180deg,#FFF5EE 0%,#FFEADB 100%)",padding:"0 48px 110px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:50,flexWrap:"wrap",gap:24 }}>
            <div>
              <span className="dm" style={{ fontSize:12,fontWeight:700,letterSpacing:2.5,textTransform:"uppercase",color:"#E8734A",display:"block",marginBottom:12 }}>Today's Menu</span>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"clamp(30px,4vw,46px)",fontWeight:900,color:"#3D1F0A",letterSpacing:"-1px" }}>
                Made fresh,<br/><span style={{ fontStyle:"italic" }}>every day</span>
              </h2>
            </div>
            <Link to="/meal-plans" className="btnOutline">View All Plans →</Link>
          </div>
          <div className="mealGrid" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:22 }}>
            {healthyMeals.map(meal=>(
              <div key={meal.name} className="mealCard">
                <div style={{ position:"relative",height:196,overflow:"hidden" }}>
                  <img src={meal.image} alt={meal.name} className="mealImg" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  <div style={{ position:"absolute",top:12,left:12,background:"#E8734A",color:"#fff",padding:"4px 11px",borderRadius:20,fontSize:10,fontFamily:"'DM Sans',sans-serif",fontWeight:700,letterSpacing:.5,textTransform:"uppercase" }}>{meal.tag}</div>
                </div>
                <div style={{ padding:"18px 20px 22px" }}>
                  <h3 style={{ fontFamily:"'Playfair Display',serif",fontSize:17,fontWeight:700,color:"#3D1F0A",marginBottom:8 }}>{meal.name}</h3>
                  <div style={{ display:"flex",gap:12,marginBottom:16 }}>
                    <span className="dm" style={{ fontSize:12,color:"#A07060",fontWeight:500 }}>🔥 {meal.cal}</span>
                    <span className="dm" style={{ fontSize:12,color:"#A07060",fontWeight:500 }}>💪 {meal.protein} protein</span>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:"#E8734A" }}>{meal.price}</span>
                    <button className="addBtn" onClick={()=>navigate("/meal-plans")} aria-label={`Add ${meal.name}`}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section style={{ padding:"0 48px 110px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",borderRadius:36,background:"linear-gradient(135deg,#E8734A 0%,#C4522E 50%,#8B2E0F 100%)",padding:"70px 62px",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",width:300,height:300,top:-70,right:-70,background:"rgba(255,200,150,.18)",opacity:.2,borderRadius:"60% 40% 55% 45%/50% 60% 40% 50%",animation:"blob 9s ease-in-out infinite",pointerEvents:"none" }}/>
          <div className="ctaInner" style={{ position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",gap:36 }}>
            <div>
              <h2 style={{ fontFamily:"'Playfair Display',serif",fontSize:"clamp(28px,3.5vw,48px)",fontWeight:900,color:"#fff",letterSpacing:"-1px",marginBottom:14 }}>
                Stop craving junk.<br/><span style={{ fontStyle:"italic",color:"#FFD4B8" }}>Start eating smart.</span>
              </h2>
              <p className="dm" style={{ color:"rgba(255,220,200,.85)",fontSize:16,maxWidth:400 }}>
                Join 500+ hostel students who swapped the burger for Rajma and never looked back.
              </p>
            </div>
            <Link to="/dashboard" className="btnWhite" style={{ flexShrink:0 }}>Get Your Plan Free →</Link>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer style={{ background:"#3D1F0A",padding:"54px 48px 34px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:42,flexWrap:"wrap",gap:36 }}>
            <div style={{ maxWidth:270 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
                <div style={{ width:36,height:36,background:"#E8734A",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>🍛</div>
                <span style={{ fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:"#fff" }}>NutriAI</span>
              </div>
              <p className="dm" style={{ fontSize:14,lineHeight:1.8,color:"rgba(255,200,170,.65)" }}>AI-Powered Indian Nutrition for Hostel Students &amp; Gym Beginners.</p>
            </div>
            <div style={{ display:"flex",gap:52,flexWrap:"wrap" }}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif",color:"#fff",fontWeight:700,fontSize:16,marginBottom:18 }}>Product</div>
                {[{l:"Meal Plans",href:"/meal-plans"},{l:"Budget Tracker",href:"/budget"},{l:"Health Dashboard",href:"/health"},{l:"How It Works",href:"/how-it-works"}].map(({l,href})=>(
                  <Link key={l} to={href} className="ftrLink">{l}</Link>
                ))}
              </div>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif",color:"#fff",fontWeight:700,fontSize:16,marginBottom:18 }}>Pages</div>
                {[{l:"About",href:"/about"},{l:"Dashboard",href:"/dashboard"},{l:"Health",href:"/health"}].map(({l,href})=>(
                  <Link key={l} to={href} className="ftrLink">{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop:"1px solid rgba(255,200,170,.12)",paddingTop:24,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
            <p className="dm" style={{ fontSize:13,color:"rgba(255,200,170,.5)" }}>© 2026 NutriAI · AI-powered nutrition for hostel life</p>
            <p className="dm" style={{ fontSize:13,color:"rgba(255,200,170,.5)" }}>Built for Hackathon 2026 🏆</p>
          </div>
        </div>
      </footer>
    </div>
  );
}