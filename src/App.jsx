import React, { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, BrainCircuit, CalendarCheck, Check, ChevronRight,
  Bell, CircleDollarSign, Dumbbell, Menu, MessageSquare, QrCode, ShieldCheck,
  Sparkles, Target, Users, X, Zap, Moon, Sun, MapPin, UserRound, Building2
} from 'lucide-react';
import GymBackground from './GymBackground';
import { DeveloperLogin, DeveloperWelcome, useDeveloperSession } from './DeveloperAccess';
import SubscriptionEditor from './SubscriptionEditor';
import DeveloperOperations from './DeveloperOperations';
import FreeTrialForm from './FreeTrialForm';
import PublicGymDirectory from './PublicGymDirectory';
import { ownerApi } from './api';

const features = [
  { id: 'members', num: '01', name: 'Members', title: 'Know every member. Before they drift away.', text: 'See profiles, goals, memberships, attendance and progress in one timeline. PulseFit flags the people who need a timely check-in.', icon: Users, metric: '184', metricLabel: 'active members', note: '12 members need attention', color: '#dfff45' },
  { id: 'attendance', num: '02', name: 'Attendance', title: 'Turn every check-in into useful insight.', text: 'Track daily visits, spot quiet periods, and identify attendance drops early—without spreadsheets or manual registers.', icon: CalendarCheck, metric: '82%', metricLabel: 'weekly attendance', note: '+8% from last month', color: '#ff8c69' },
  { id: 'coaching', num: '03', name: 'Coaching', title: 'Give trainers a workflow they will actually use.', text: 'Assign members, schedule sessions, build plans, message clients and track completion from a focused trainer workspace.', icon: Dumbbell, metric: '46', metricLabel: 'sessions this week', note: '91% plan completion', color: '#a6b7ff' },
  { id: 'revenue', num: '04', name: 'Revenue', title: 'See what is paid, due and at risk.', text: 'Manage plans, payments and renewals with a clean revenue view. Follow up before an expired plan becomes a lost member.', icon: CircleDollarSign, metric: '₹4.8L', metricLabel: 'monthly revenue', note: '18 renewals due soon', color: '#ffd561' },
  { id: 'ai', num: '05', name: 'AI plans', title: 'Personalization without the paperwork.', text: 'Create tailored workout and diet plans faster, while trainers keep full control of every recommendation.', icon: BrainCircuit, metric: '6 min', metricLabel: 'average plan setup', note: '24 plans created this week', color: '#dfff45' },
  { id: 'reports', num: '06', name: 'Reports', title: 'Make decisions from signals, not guesses.', text: 'Understand growth, retention, trainer activity and gym performance through simple reports built for action.', icon: BarChart3, metric: '+14%', metricLabel: 'member retention', note: 'Strongest quarter yet', color: '#ff8c69' },
];

const memberFeatures = [
  { icon: BarChart3, title: 'Personal dashboard', text: 'See today’s workout and meal plan, upcoming classes, attendance, active goals and recent achievements in one view.' },
  { icon: CalendarCheck, title: 'QR attendance', text: 'Scan the gym reception QR, check in and out, and review weekly and monthly attendance history.' },
  { icon: Dumbbell, title: 'Assigned workouts', text: 'Open trainer-assigned plans with exercises, sets, repetitions, rest times, equipment and training notes.' },
  { icon: BrainCircuit, title: 'AI workout coach', text: 'Use camera-based pose tracking during supported workouts to review form, tempo, stability, balance and fatigue.' },
  { icon: Target, title: 'Goals and progress', text: 'Track weight, calories, workout consistency and fitness-goal completion over time.' },
  { icon: Check, title: 'Meal and diet plans', text: 'Follow trainer-created nutrition plans, daily meals, calorie targets and food guidance.' },
  { icon: Users, title: 'Classes and trainer', text: 'View upcoming gym classes, assigned trainer information and coaching details.' },
  { icon: CircleDollarSign, title: 'Membership and payments', text: 'Review membership status, plan dates, payment history, invoices and available receipt information.' },
  { icon: Bell, title: 'Notifications', text: 'Keep up with workout, membership, payment and gym updates from one notification center.' },
  { icon: Sparkles, title: 'Rewards and achievements', text: 'See earned rewards, points and achievements that recognise consistent effort.' },
  { icon: UserRound, title: 'Profile and settings', text: 'Manage personal profile information, account preferences, appearance and security settings.' },
  { icon: ShieldCheck, title: 'Member support', text: 'Access gym support information when you need help with your membership or app experience.' },
];

const scrollToDemo = () => document.getElementById('demo')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });

function Logo() {
  return <a href="#top" className="logo" aria-label="PulseFit home"><span className="logo-mark"><Zap size={17} fill="currentColor" /></span><span>pulsefit</span></a>;
}

function Nav({ session, checking, onLogin, onLogout, themeMode, resolvedTheme, onCycleTheme }) {
  const [open, setOpen] = useState(false);
  return <header className="nav-wrap"><nav className="nav shell" aria-label="Main navigation">
    <Logo />
    <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
    <div className={`nav-links ${open ? 'open' : ''}`}>
      <a href="#gyms" onClick={() => setOpen(false)}>Find gyms</a><a href="#member-features" onClick={() => setOpen(false)}>For members</a><a href="#product" onClick={() => setOpen(false)}>For owners</a><a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
      <button className="theme-toggle" type="button" onClick={onCycleTheme} aria-label={`Theme: ${themeMode}. Switch appearance`} title={`Appearance: ${themeMode}`}>
        {resolvedTheme === 'dark' ? <Moon size={17}/> : <Sun size={17}/>}<span>{themeMode === 'system' ? 'Auto' : themeMode}</span>
      </button>
      <span className="nav-divider" />{session ? <><a href="#developer-console">{session.user.full_name}</a><button className="nav-login" type="button" onClick={onLogout}>Log out</button></> : <button className="nav-login" type="button" disabled={checking} onClick={() => { setOpen(false); onLogin(); }}>Platform login</button>}<button className="btn btn-dark nav-cta" onClick={() => { setOpen(false); scrollToDemo(); }}>List your gym <ArrowRight size={16}/></button>
    </div>
  </nav></header>;
}

function DashboardMock() {
  return <div className="dash" aria-label="PulseFit owner dashboard preview">
    <aside className="dash-side"><Logo /><div className="side-items"><b>Overview</b><span>Members</span><span>Attendance</span><span>Trainers</span><span>Payments</span><span>Reports</span></div><div className="owner"><span>GR</span><small>Ganesh R<br/><i>Gym owner</i></small></div></aside>
    <div className="dash-main">
      <div className="dash-head"><div><small>MONDAY, 07 AUG</small><h3>Good morning, Ganesh R.</h3></div><div className="dash-head-actions"><div className="live-workout"><div className="lifter"><i className="head"/><i className="body"/><i className="arm left"/><i className="arm right"/><i className="bar"/><i className="weight weight-left"/><i className="weight weight-right"/></div><span><b>LIVE FLOOR</b><small>18 training now</small></span></div><button><MessageSquare size={15}/> 3</button></div></div>
      <div className="stat-row"><div><small>ACTIVE MEMBERS</small><strong>184</strong><em>+12 this month</em></div><div><small>MONTHLY REVENUE</small><strong>₹4.8L</strong><em>+8.4% vs last month</em></div><div><small>CHECKED IN TODAY</small><strong>67</strong><em>Peak at 7:00 PM</em></div></div>
      <div className="dash-grid"><div className="chart-card"><div className="card-title"><b>Member activity</b><span>Last 7 days</span></div><div className="bars">{[52,72,61,88,69,95,78].map((h,i)=><div key={i} className={i===5?'hot':''} style={{height:`${h}%`}}><span>{['M','T','W','T','F','S','S'][i]}</span></div>)}</div></div><div className="attention"><div className="card-title"><b>Needs attention</b><span>View all</span></div>{[['RM','Riya M.','7 days absent'],['AS','Aman S.','Plan expires today'],['NK','Nisha K.','Renewal in 3 days']].map(x=><div className="person" key={x[1]}><i>{x[0]}</i><span><b>{x[1]}</b><small>{x[2]}</small></span><ChevronRight size={15}/></div>)}</div></div>
    </div>
  </div>;
}

function FeatureExplorer() {
  const [active, setActive] = useState(features[0]);
  const Icon = active.icon;
  return <section id="product" className="feature-section shell section-pad">
    <div className="section-intro"><span className="eyebrow">PulseFit for gym owners</span><h2>Everything your gym needs.<br/><em>Nothing it doesn’t.</em></h2><p>After listing your gym publicly, manage members, trainers, attendance, payments and growth from one connected workspace.</p></div>
    <div className="feature-explorer">
      <div className="feature-tabs" role="tablist" aria-label="Product features">{features.map(f=><button key={f.id} className={active.id===f.id?'active':''} onClick={()=>setActive(f)} role="tab" aria-selected={active.id===f.id}><span>{f.num}</span>{f.name}<ChevronRight size={18}/></button>)}</div>
      <div className="feature-detail" role="tabpanel"><div className="feature-copy"><span className="feature-icon" style={{background:active.color}}><Icon size={25}/></span><h3>{active.title}</h3><p>{active.text}</p><a href="#demo">Explore {active.name.toLowerCase()} <ArrowRight size={17}/></a></div><div className="metric-card" style={{'--accent':active.color}}><Sparkles size={21}/><strong>{active.metric}</strong><span>{active.metricLabel}</span><div><i/><small>{active.note}</small></div></div></div>
    </div>
  </section>;
}

function MemberExperience() {
  return <section className="member-experience section-pad" id="member-features"><div className="shell"><div className="member-experience-head"><div className="section-intro light"><span className="eyebrow">PulseFit for gym members</span><h2>Your complete fitness journey.<br/><em>Always within reach.</em></h2><p>Once your gym adds you as a member, PulseFit connects your training, nutrition, attendance, progress and membership information.</p></div><div className="member-access-note"><UserRound/><span><b>Secure member access</b><small>Member features use the account provided by your registered PulseFit gym.</small></span></div></div><div className="member-feature-grid">{memberFeatures.map(({ icon: Icon, title, text }, index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><Icon/><h3>{title}</h3><p>{text}</p></article>)}</div><div className="member-feature-foot"><div><ShieldCheck/><span><b>Your gym controls your membership</b><small>Workout, trainer, diet, attendance and billing information comes from your registered gym.</small></span></div><a href="#gyms">Find a PulseFit gym <MapPin size={17}/></a></div></div></section>;
}

const lifecycle = [
  { icon: Users, label: 'Join', title: 'Member onboarding', text: 'Profiles, health details, goals, membership plans and trainer assignment start in one clean record.' },
  { icon: QrCode, label: 'Visit', title: 'Attendance & access', text: 'QR-ready check-in and check-out, visit history, daily limits and live attendance keep your front desk moving.' },
  { icon: Dumbbell, label: 'Train', title: 'Workout coaching', text: 'Trainers assign structured workouts with exercises, sets, reps, notes, schedules and completion history.' },
  { icon: Target, label: 'Progress', title: 'Goals & nutrition', text: 'Members follow meal plans, hydration, body goals and progress while trainers see what is actually completed.' },
  { icon: CircleDollarSign, label: 'Renew', title: 'Payments & retention', text: 'Track plan expiry, invoices, paid and due amounts, receipts and renewal reminders before revenue slips away.' },
];

const fallbackPlans = [
  { id:'launch', name:'Launch', price_cents:199900, currency:'INR', billing_period:'month', description:'For independent gyms getting organised', member_limit:'Up to 150 members', cta_label:'Start 1 month free', features:['Owner + staff dashboard','Member management','Attendance & check-in','Membership plans & payments','Basic reports','Member mobile experience'] },
  { id:'grow', name:'Grow', price_cents:399900, currency:'INR', billing_period:'month', description:'For growing teams that want more automation', member_limit:'Up to 500 members', cta_label:'Start 1 month free', is_popular:true, features:['Everything in Launch','Trainer workspaces','Workout & diet planning','Goals and progress tracking','Advanced reports','Roles and permissions','Priority support'] },
  { id:'scale', name:'Scale', price_cents:null, currency:'INR', billing_period:null, description:'For multi-location fitness businesses', member_limit:'500+ members', cta_label:'Talk to us', features:['Everything in Grow','Multiple gym locations','Cross-location analytics','Custom roles and controls','Data onboarding support','Dedicated success manager'] },
];

const formatPlanPrice = (plan) => plan.price_cents == null
  ? 'Custom'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency, maximumFractionDigits: 0 }).format(plan.price_cents / 100);

function useThemePreference() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem('pulsefit-theme') || 'system');
  const [systemTheme, setSystemTheme] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (event) => setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    localStorage.setItem('pulsefit-theme', themeMode);
  }, [resolvedTheme, themeMode]);

  const cycleTheme = () => setThemeMode((current) => current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system');
  return { themeMode, resolvedTheme, cycleTheme };
}

function App() {
  const { themeMode, resolvedTheme, cycleTheme } = useThemePreference();
  const { session, checking, sessionError, save, clear } = useDeveloperSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [plans, setPlans] = useState(fallbackPlans);
  const [listedGymCount, setListedGymCount] = useState(null);
  const loadPlans = () => ownerApi.publicPlans().then((items) => setPlans(items)).catch(() => undefined);
  useEffect(() => { loadPlans(); }, []);
  useEffect(()=>{ const els=document.querySelectorAll('.reveal'); const io=new IntersectionObserver(es=>es.forEach(e=>e.isIntersecting&&e.target.classList.add('visible')),{threshold:.12}); els.forEach(el=>io.observe(el)); return()=>io.disconnect(); },[]);
  return <><Nav session={session} checking={checking} onLogin={() => setLoginOpen(true)} onLogout={clear} themeMode={themeMode} resolvedTheme={resolvedTheme} onCycleTheme={cycleTheme}/><main id="top">{sessionError ? <div className="shell login-error" role="alert">{sessionError} <button className="btn btn-outline" onClick={() => setLoginOpen(true)}>Sign in</button></div> : null}{session ? <><DeveloperWelcome session={session} onLogout={clear}/><DeveloperOperations key={session.user.id} session={session}/><SubscriptionEditor key={session.user.id} session={session} onSaved={loadPlans}/></> : null}
    <div className="trial-strip"><span><Sparkles size={15}/> Limited launch offer</span><b>Your first month is completely free.</b><button onClick={scrollToDemo}>Start free — no card required <ArrowRight size={15}/></button></div>
    <section className="hero shell"><GymBackground/><div className="hero-copy"><div className="hero-eyebrow"><span/> YOUR NEXT CHAPTER STARTS HERE</div><h1>Find your gym.<br/><span>Feel your best.</span></h1><p>Discover a space that moves you. Explore nearby gyms, find your fit, and make every day stronger.</p><div className="hero-actions"><a className="btn btn-lime" href="#gyms">Explore nearby gyms <ArrowRight size={18}/></a><button className="text-link" onClick={scrollToDemo}>List your gym <ArrowRight size={17}/></button></div><div className="hero-listing-proof" aria-live="polite"><Building2 size={18}/><span>{listedGymCount === null ? 'Discover gyms on PulseFit' : <><strong>{listedGymCount.toLocaleString('en-IN')}</strong> {listedGymCount === 1 ? 'gym listed' : 'gyms listed'} on PulseFit</>}<small>Own a gym? Get discovered. Start your first month free.</small></span></div><small className="hero-fine"><Check size={14}/> Free to explore. No account needed.</small></div><div className="hero-side"><a className="hero-owner-note" href="#demo"><span className="hero-owner-icon"><Building2 size={22}/></span><span><small>BUILT FOR GYM OWNERS, TOO</small><b>List your gym.<br/>Reach your next member.</b><em>Start your free month <ArrowRight size={15}/></em></span></a></div><div className="hero-caption"><span>YOUR SPACE. YOUR PACE.</span><a href="#for-everyone">Discover the PulseFit experience <ArrowRight size={14}/></a></div></section>
    <section className="audience-section shell section-pad reveal" id="for-everyone"><div className="section-intro"><span className="eyebrow">Made for the whole gym community</span><h2>One connected platform.<br/><em>Three ways to use it.</em></h2></div><div className="audience-grid"><article><MapPin/><h3>Looking for a gym?</h3><p>Use your location to discover registered PulseFit gyms nearby and compare useful information before choosing.</p><a href="#gyms">Find nearby gyms <ArrowRight size={16}/></a></article><article><UserRound/><h3>Already a member?</h3><p>Use your secure member account for workouts, diet plans, QR attendance, progress, classes, payments, rewards and gym updates.</p><a href="#member-features">Explore member features <ArrowRight size={16}/></a></article><article><Building2/><h3>Own a gym?</h3><p>List your gym and use PulseFit to manage members, trainers, attendance, payments, plans and business growth.</p><button onClick={scrollToDemo}>Start your free month <ArrowRight size={16}/></button></article></div></section>
    <PublicGymDirectory onListedCount={setListedGymCount}/>
    <MemberExperience/>
    <section className="dashboard-stage"><div className="shell"><div className="owner-section-label"><span>FOR GYM OWNERS</span><h2>Run your entire gym after people discover it.</h2><p>Your public listing brings people to your gym. The PulseFit workspace helps your team serve them from first inquiry to renewal.</p></div><DashboardMock/><div className="proof-row"><span>YOUR GYM, AT A GLANCE</span><div><b>10+ hrs</b><small>saved every week</small></div><div><b>2× faster</b><small>member follow-up</small></div><div><b>100%</b><small>clearer operations</small></div></div></div></section>
    <section className="problem shell section-pad reveal"><span className="eyebrow">For owners and their members</span><div className="problem-grid"><h2>Discovery outside.<br/>Clarity inside.</h2><div><p>People can find registered PulseFit gyms without logging in, then review location, facilities, membership details and business contact information.</p><p>Inside each gym, PulseFit connects member records, attendance, coaching, staff and payments so owners deliver a better experience.</p><div className="check-row"><span><Check/> Easy gym discovery</span><span><Check/> Clear member journey</span><span><Check/> Connected operations</span></div></div></div></section>
    <FeatureExplorer/>
    <section className="lifecycle section-pad"><div className="shell"><div className="section-intro"><span className="eyebrow">The complete member journey</span><h2>PulseFit checks every moving part.<br/><em>From joining to renewing.</em></h2><p>Every action updates the same member record, giving each role exactly the context they need.</p></div><div className="life-flow">{lifecycle.map((item,i)=>{const Icon=item.icon;return <article key={item.label}><div className="life-head"><span>{String(i+1).padStart(2,'0')}</span><Icon/></div><small>{item.label}</small><h3>{item.title}</h3><p>{item.text}</p>{i<lifecycle.length-1&&<ChevronRight className="life-arrow"/>}</article>})}</div><div className="role-row"><span><ShieldCheck/> One secure system</span><div><b>Owner</b><small>Business overview</small></div><div><b>Reception</b><small>Members & check-ins</small></div><div><b>Trainer</b><small>Plans & progress</small></div><div><b>Member</b><small>Daily fitness journey</small></div><div><b>Super admin</b><small>Platform control</small></div></div></div></section>
    <section id="how" className="how section-pad"><div className="shell"><div className="section-intro light"><span className="eyebrow">Simple by design</span><h2>From scattered to sorted.<br/><em>In three moves.</em></h2></div><div className="steps">{[
      ['01','Set up','Bring in your members, plans, staff and gym details. We help you get organised from day one.'],['02','Run daily','Check-ins, assignments, payments and member follow-ups flow through one shared system.'],['03','Improve','Use clear reports and AI-assisted planning to retain more members and grow with confidence.']
    ].map((s,i)=><article key={s[0]}><span>{s[0]}</span><div className="step-icon">{i===0?<Users/>:i===1?<CalendarCheck/>:<BarChart3/>}</div><h3>{s[1]}</h3><p>{s[2]}</p>{i<2&&<ArrowRight className="step-arrow"/>}</article>)}</div></div></section>
    <section id="results" className="results shell section-pad reveal"><div className="result-image"><img src="/gym-detail.png" alt="PulseFit gym serving members in a modern training space"/><div className="image-tag"><b>184</b><span>members, one clear view</span></div></div><div className="result-copy"><span className="eyebrow">Better for everyone</span><h2>Help people choose. Help gyms deliver.</h2><p>Gym seekers get transparent information, members get a more connected experience, and owners get the operational clarity to grow sustainably.</p><div className="result-list"><div><b>01</b><span><strong>Make gyms easier to discover</strong><small>Show accurate location, facilities, contact and membership information publicly.</small></span></div><div><b>02</b><span><strong>Keep members engaged</strong><small>Connect attendance, coaching, goals and communication around each member.</small></span></div><div><b>03</b><span><strong>Give owners control</strong><small>Track staff, payments, renewals and performance in one secure workspace.</small></span></div></div></div></section>
    <section className="quote-band"><div className="shell"><div className="quote-mark">“</div><blockquote>PulseFit gave us something we never had before: one version of the truth for the whole gym.</blockquote><div className="quote-author"><span>RK</span><p><b>Rahul Khanna</b><small>Owner, Northside Strength</small></p></div><div className="quote-stats"><span><b>28%</b><small>less admin time</small></span><span><b>17%</b><small>higher renewals</small></span></div></div></section>
    <section id="pricing" className="pricing section-pad"><div className="shell"><div className="pricing-head"><div className="section-intro"><span className="eyebrow">Owner platform pricing</span><h2>Public discovery is free.<br/><em>Owners start free too.</em></h2><p>Visitors never pay to search PulseFit gyms. These plans are for gym owners using the management platform.</p></div><div className="free-callout"><Sparkles/><span><b>1 month free on every owner plan</b><small>No credit card required. Your paid plan starts only after the trial.</small></span></div></div><div className="plan-grid">{plans.map(plan=>{const price=formatPlanPrice(plan);return <article className={plan.is_popular?'popular':''} key={plan.id}>{plan.is_popular&&<span className="popular-tag">Most popular</span>}<div className="plan-name"><span>{plan.name}</span><small>{plan.description}</small></div><div className="plan-price"><b>{price}</b>{price!=='Custom'&&plan.billing_period?<span>/ {plan.billing_period}</span>:null}</div><div className="member-limit"><Users size={17}/>{plan.member_limit}</div><button className={`btn ${plan.is_popular?'btn-lime':'btn-outline'}`} onClick={() => { setSelectedPlanId(plan.id); scrollToDemo(); }}>{plan.cta_label} <ArrowRight size={17}/></button><div className="plan-features"><b>Owner tools included</b>{plan.features.map(f=><span key={f}><Check size={15}/>{f}</span>)}</div></article>})}</div><p className="pricing-note">Owner-platform prices are billed monthly and exclude applicable taxes. Finding and viewing gyms is free for the public.</p></div></section>
    <section id="demo" className="demo section-pad"><div className="shell demo-grid"><div><span className="eyebrow">For gym owners and authorised managers</span><h2>List your gym.<br/>Start one month free.</h2><p>Create your PulseFit owner inquiry to publish accurate gym information and explore the connected management platform. Public visitors do not need to complete this form.</p><div className="demo-points"><span><Check/> Public gym discovery profile</span><span><Check/> Complete owner-platform access</span><span><Check/> Guided setup with no card required</span></div></div><FreeTrialForm plans={plans} selectedPlanId={selectedPlanId}/></div></section>
  </main><footer><div className="shell footer-top"><div><Logo/><p>Find a gym near you.<br/>Train, manage and grow together.</p></div><div><b>For members</b><a href="#gyms">Find nearby gyms</a><a href="#member-features">Member app features</a><a href="#results">Why PulseFit</a></div><div><b>For gym owners</b><a href="#product">Owner features</a><a href="#pricing">Owner pricing</a><a href="#demo">List your gym</a></div><div className="footer-note"><Sparkles/><span>One platform for<br/>every fitness journey.</span></div></div><div className="shell footer-bottom"><span>© 2026 PulseFit Technologies</span><span>Gym discovery · Member fitness · Gym management</span></div></footer><DeveloperLogin open={loginOpen} onClose={() => setLoginOpen(false)} onAuthenticated={save}/></>;
}

export default App;
