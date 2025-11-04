import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const featureHighlights = [
  {
    title: 'Command Central Dashboard',
    description:
      'Visualise portfolio health at a glance with live KPIs for open jobs, overdue work, safety alerts, and subscription status reminders.',
  },
  {
    title: 'Property & Unit Intelligence',
    description:
      'Create rich property records with image galleries, manage unit inventories, and keep everything searchable across your estate.',
  },
  {
    title: 'Inspections That Stay On Track',
    description:
      'Schedule inspections, track progress, and capture follow-up work orders without losing momentum or compliance history.',
  },
  {
    title: 'Jobs & Service Requests',
    description:
      'Assign technicians, monitor status changes in real time, and convert recommendations into actionable jobs with one click.',
  },
  {
    title: 'Data-Driven Plans & Reports',
    description:
      'Build preventative maintenance plans, run owner-ready reports, and share insights that keep stakeholders aligned.',
  },
  {
    title: 'Team Access & Notifications',
    description:
      'Invite owners, tenants, and vendors, control roles, and keep everyone up to speed with notifications and global search.',
  },
];

const workflow = [
  {
    title: 'Capture',
    description:
      'Centralise every asset, unit, inspection, and service request so nothing slips through the cracks.',
  },
  {
    title: 'Plan',
    description:
      'Prioritise jobs, assign the right technicians, and build recurring maintenance plans that match your SLAs.',
  },
  {
    title: 'Execute',
    description:
      'Technicians receive job details instantly, update progress from the field, and resolve issues faster.',
  },
  {
    title: 'Report',
    description:
      'Share branded reports, subscription status, and activity histories with owners and investors in one click.',
  },
];

const roles = [
  {
    title: 'Property Managers',
    blurb:
      'Monitor operations in one dashboard, assign work with confidence, and keep portfolios inspection-ready.',
  },
  {
    title: 'Technicians',
    blurb:
      'Receive crystal-clear job briefs, log progress, attach evidence, and close out work without paperwork.',
  },
  {
    title: 'Owners & Investors',
    blurb:
      'Access clean performance reports, approve plans, and track capital projects without chasing updates.',
  },
  {
    title: 'Tenants',
    blurb:
      'Submit service requests, follow status updates, and get transparency on issue resolution timelines.',
  },
];

const differentiators = [
  {
    title: 'Role-aware security',
    description: 'Single sign-on ready authentication, secure password reset, and permissions tailored to each user type.',
  },
  {
    title: 'Everywhere your team works',
    description: 'Responsive UI, keyboard-friendly workflows, and translation-ready experiences powered by i18next.',
  },
  {
    title: 'Faster decisions',
    description: 'React Query-powered data keeps dashboards, search, and notifications fresh without manual refreshes.',
  },
];

const faqs = [
  {
    question: 'Can I invite owners, technicians, or tenants to collaborate?',
    answer: 'Yes. Send invitations from the Team workspace, assign roles, and manage pending invites before they onboard.',
  },
  {
    question: 'How quickly can we launch?',
    answer:
      'Spin up your account in minutes, import properties, and start assigning jobs immediately. No complex configuration required.',
  },
  {
    question: 'Does AgentFM support compliance reporting?',
    answer:
      'Generate portfolio and property-level reports, track inspection outcomes, and share summaries with stakeholders anytime.',
  },
];

const testimonials = [
  {
    quote:
      '“AgentFM replaced five disconnected tools. Our team completes inspections 30% faster and owners love the live dashboards.”',
    name: 'Sasha I.',
    role: 'Head of Facilities, UrbanWorks Group',
  },
  {
    quote: '“Technicians finally see the full job context and can close work orders from the field without paperwork.”',
    name: 'Daniel K.',
    role: 'Operations Manager, Prime Property Services',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <header className="landing-hero">
        <nav className="landing-nav">
          <div className="landing-logo" onClick={() => navigate('/')}>AgentFM</div>
          <div className="landing-nav-links">
            <a href="#features">Platform</a>
            <a href="#workflow">How it works</a>
            <a href="#roles">Solutions</a>
            <a href="#faqs">FAQ</a>
          </div>
          <div className="landing-nav-cta">
            <Link to="/signin" className="landing-link">
              Sign in
            </Link>
            <Link to="/signup" className="landing-button">
              Start free trial
            </Link>
          </div>
        </nav>

        <div className="landing-hero-content">
          <div className="landing-hero-copy">
            <span className="landing-badge">The operating system for modern facilities teams</span>
            <h1>Bring every property, job, and inspection together in one command centre.</h1>
            <p>
              AgentFM gives property and facilities teams a unified workspace to plan preventative maintenance, execute service
              requests, and deliver owner-ready reporting without spreadsheets or fragmented tools.
            </p>
            <div className="landing-cta-group">
              <Link to="/signup" className="landing-button landing-button--primary">
                Launch your workspace
              </Link>
              <Link to="/dashboard" className="landing-button landing-button--secondary">
                Explore the product
              </Link>
            </div>
            <div className="landing-stats">
              <div>
                <strong>360° portfolio view</strong>
                <span>Dashboards, live alerts, and KPI tracking</span>
              </div>
              <div>
                <strong>Field-ready workflows</strong>
                <span>Technician dashboards and mobile-friendly UI</span>
              </div>
              <div>
                <strong>Stakeholder trust</strong>
                <span>Owner reports, subscription insights, and audit trails</span>
              </div>
            </div>
          </div>

          <div className="landing-hero-panel">
            <div className="landing-hero-card">
              <h3>What&apos;s happening today</h3>
              <ul>
                <li>
                  <span className="dot dot--red" /> 5 overdue inspections need action
                </li>
                <li>
                  <span className="dot dot--amber" /> 12 jobs awaiting technician updates
                </li>
                <li>
                  <span className="dot dot--green" /> All subscriptions in good standing
                </li>
              </ul>
              <button type="button" className="landing-button landing-button--panel" onClick={() => navigate('/dashboard')}>
                View live dashboard
              </button>
            </div>
            <div className="landing-hero-card landing-hero-card--secondary">
              <h3>Smart search &amp; alerts</h3>
              <p>Jump to any property, inspection, or service request in seconds and keep teams aligned with real-time alerts.</p>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section id="features" className="landing-section">
          <div className="landing-section-header">
            <span className="landing-eyebrow">Why AgentFM</span>
            <h2>A single platform for the entire property operations lifecycle</h2>
            <p>Everything your team needs to manage properties, vendors, inspections, and stakeholder expectations in one place.</p>
          </div>
          <div className="landing-grid">
            {featureHighlights.map((feature) => (
              <article key={feature.title} className="landing-card">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="landing-section landing-section--muted">
          <div className="landing-section-header">
            <span className="landing-eyebrow">Workflow</span>
            <h2>From intake to insight without leaving the platform</h2>
            <p>AgentFM guides every job, inspection, and subscription through a streamlined process your whole organisation can trust.</p>
          </div>
          <div className="landing-steps">
            {workflow.map((step) => (
              <div key={step.title} className="landing-step">
                <div className="landing-step-icon">{step.title.charAt(0)}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-header" id="roles">
            <span className="landing-eyebrow">Tailored experiences</span>
            <h2>Every stakeholder gets the workspace built for their day</h2>
            <p>Role-specific dashboards, permissions, and notifications keep everyone informed without oversharing sensitive data.</p>
          </div>
          <div className="landing-grid landing-grid--roles">
            {roles.map((role) => (
              <article key={role.title} className="landing-card landing-card--role">
                <h3>{role.title}</h3>
                <p>{role.blurb}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--accent">
          <div className="landing-section-split">
            <div>
              <span className="landing-eyebrow landing-eyebrow--light">Built-in advantages</span>
              <h2>Enterprise-grade foundations without enterprise overhead</h2>
              <p>
                AgentFM ships with the guardrails, localisation, and automation you need on day one—no plug-ins or custom
                development required.
              </p>
            </div>
            <div className="landing-list">
              {differentiators.map((item) => (
                <div key={item.title} className="landing-list-item">
                  <div className="landing-step-icon landing-step-icon--small">✓</div>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--muted">
          <div className="landing-section-header">
            <span className="landing-eyebrow">Customer stories</span>
            <h2>Teams trust AgentFM to run high-performing portfolios</h2>
          </div>
          <div className="landing-testimonials">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.name} className="landing-testimonial">
                <blockquote>{testimonial.quote}</blockquote>
                <figcaption>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-pricing">
            <div className="landing-pricing-copy">
              <span className="landing-eyebrow">Flexible pricing</span>
              <h2>Start free, upgrade when you&apos;re ready</h2>
              <p>
                Launch with a full-featured trial, then pick the subscription tier that matches your portfolio size. Manage billing
                and renewals directly inside AgentFM.
              </p>
              <Link to="/subscriptions" className="landing-button landing-button--primary">
                View plans
              </Link>
            </div>
            <div className="landing-pricing-panel">
              <h3>Included in every plan</h3>
              <ul>
                <li>Unlimited properties and units</li>
                <li>Inspection scheduling &amp; recommendations</li>
                <li>Technician job assignments &amp; updates</li>
                <li>Owner-ready reporting &amp; exports</li>
                <li>Role-based access control &amp; audit logs</li>
                <li>Email-based password resets &amp; alerts</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="faqs" className="landing-section landing-section--muted">
          <div className="landing-section-header">
            <span className="landing-eyebrow">FAQ</span>
            <h2>Answers to common questions</h2>
          </div>
          <div className="landing-faqs">
            {faqs.map((faq) => (
              <details key={faq.question} className="landing-faq">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--cta">
          <div className="landing-section-header">
            <span className="landing-eyebrow landing-eyebrow--light">Get started</span>
            <h2>Modern facilities teams run on AgentFM</h2>
            <p>Bring clarity to your operations in under 15 minutes. We&apos;ll handle the onboarding—you focus on your properties.</p>
          </div>
          <div className="landing-cta-group">
            <Link to="/signup" className="landing-button landing-button--primary">
              Start free trial
            </Link>
            <Link to="/signin" className="landing-button landing-button--secondary">
              Already have an account?
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div>
            <div className="landing-logo">AgentFM</div>
            <p>All-in-one facilities and property operations platform.</p>
          </div>
          <div className="landing-footer-links">
            <Link to="/signin">Sign in</Link>
            <Link to="/signup">Create account</Link>
            <Link to="/forgot-password">Reset password</Link>
            <Link to="/reports">Reports</Link>
          </div>
        </div>
        <p className="landing-footer-note">© {new Date().getFullYear()} AgentFM. All rights reserved.</p>
      </footer>
    </div>
  );
}
