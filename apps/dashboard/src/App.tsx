import React from 'react';
import { Navbar } from './components/layout/Navbar';
import { WizardSteps } from './components/wizard/WizardSteps';
import { Step1Source } from './components/wizard/Step1Source';
import { Step2Brand } from './components/wizard/Step2Brand';
import { Step3Shield } from './components/wizard/Step3Shield';
import { Step4Build } from './components/wizard/Step4Build';
import { Step5Publish } from './components/wizard/Step5Publish';
import { useProjectStore } from './stores/useProjectStore';
import { ShieldCheck, Lock } from './components/ui/Icons';

export const App: React.FC = () => {
  const { activeStep } = useProjectStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', background: 'var(--bg-canvas)' }}>
      <Navbar />
      <WizardSteps />

      <main style={{ flex: 1, padding: '0 24px 32px 24px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>
        {activeStep === 1 && <Step1Source />}
        {activeStep === 2 && <Step2Brand />}
        {activeStep === 3 && <Step3Shield />}
        {activeStep === 4 && <Step4Build />}
        {activeStep === 5 && <Step5Publish />}
      </main>

      {/* Cockpit Status Footer */}
      <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="pulse-indicator pulse-emerald" />
            <span>GENIEFLOW OS AGENT ENGINE</span>
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={12} color="var(--cyan-primary)" />
            <span>ZERO-KNOWLEDGE VAULT (AES-256-GCM)</span>
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} color="var(--emerald-success)" />
            <span>APPLE 4.2 COMPLIANCE SHIELD</span>
          </span>
        </div>

        <div>
          <span>AIRSHIP PLATFORM v1.0.0 • PRODUCTION GRADE • RULE 1 VERIFIED</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
