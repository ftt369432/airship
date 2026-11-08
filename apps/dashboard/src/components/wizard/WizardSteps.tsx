import React from 'react';
import { Layers, Palette, ShieldCheck, Terminal, UploadCloud, CheckCircle } from '../ui/Icons';
import { useProjectStore } from '../../stores/useProjectStore';

const STEPS = [
  { id: 1, label: 'Source Intake', icon: Layers, desc: 'URL / GitHub / ZIP' },
  { id: 2, label: 'Brand Suite', icon: Palette, desc: '1024px Asset Engine' },
  { id: 3, label: 'Compliance Shield', icon: ShieldCheck, desc: 'Store Rule 4.2 Pre-Flight' },
  { id: 4, label: 'Build & Telemetry', icon: Terminal, desc: 'Fastlane Cloud CI' },
  { id: 5, label: 'Store Publish', icon: UploadCloud, desc: 'Play & TestFlight' }
];

export const WizardSteps: React.FC = () => {
  const { activeStep, setActiveStep } = useProjectStore();

  return (
    <div style={{ padding: '0 24px 20px 24px' }}>
      <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep === step.id;
          const isDone = activeStep > step.id;

          return (
            <React.Fragment key={step.id}>
              <div 
                onClick={() => setActiveStep(step.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  cursor: 'pointer',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                  transition: 'var(--transition-smooth)'
                }}
              >
                <div 
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    background: isActive ? 'var(--gradient-primary)' : isDone ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isActive ? '#08090c' : isDone ? 'var(--emerald-success)' : 'var(--text-secondary)'
                  }}
                >
                  {isDone ? <CheckCircle size={18} /> : <Icon size={18} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: isActive ? 'var(--cyan-primary)' : 'var(--text-muted)' }}>
                      0{step.id}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {step.label}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{step.desc}</span>
                </div>
              </div>

              {idx < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '1px', background: isDone ? 'var(--emerald-success)' : 'var(--border-subtle)', margin: '0 8px', opacity: isDone ? 0.6 : 0.3 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
