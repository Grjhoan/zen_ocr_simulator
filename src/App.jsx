import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  MessageSquare,
  PhoneCall,
  Voicemail,
  Settings,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Sparkles,
  Users,
  Layers,
  Award,
  Clock,
  Sliders,
  PlusCircle,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  Tag,
  Zap,
  UserCheck,
  Sun,
  Moon,
  Globe,
  LayoutGrid,
  Workflow,
} from 'lucide-react';
import {
  UI_STRINGS,
  CHANNELS,
  UNIFIED_STATUSES,
  SKILLS_CATALOG,
  INITIAL_AGENTS,
  PRESET_SCENARIOS,
  STEP_DEFINITIONS,
  ZENDESK_PLANS,
} from './data/scenarios';
import {
  evaluateOmnichannelRouting,
  sortQueueTickets,
} from './utils/routingEngine';
import VisualFlowRibbon from './components/VisualFlowRibbon';
import SimpleDiagramView from './components/SimpleDiagramView';

const STATUS_ORDER = ['online', 'away', 'offline', 'meeting'];
const PRIORITY_ORDER = ['Urgent', 'High', 'Normal', 'Low'];
const GROUP_ORDER = ['VIP Support', 'Support', 'Billing', 'Tech Tier 2'];
const SKILL_CYCLE = ['German', 'Billing', 'Tech', 'VIP', null];

function getSystemScheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getInitialResolvedTheme() {
  try {
    const stored = localStorage.getItem('color-scheme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (e) {}
  return getSystemScheme();
}

export default function App() {
  // Language ('en' | 'es')
  const [lang, setLang] = useState('en');
  const t = UI_STRINGS[lang] || UI_STRINGS.en;

  // UI Model ('simple' | 'extended')
  const [uiMode, setUiMode] = useState('simple');

  // Theme ('light' | 'dark') following dark-mode-toggle guidance
  const [resolvedTheme, setResolvedTheme] = useState(getInitialResolvedTheme);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e) => {
      try {
        const stored = localStorage.getItem('color-scheme');
        if (stored !== 'light' && stored !== 'dark') {
          setResolvedTheme(e.matches ? 'dark' : 'light');
        }
      } catch (err) {
        setResolvedTheme(e.matches ? 'dark' : 'light');
      }
    };

    const handleStorage = (e) => {
      if (e.key === 'color-scheme') {
        const val = e.newValue;
        const meta = document.querySelector('meta[name="color-scheme"]');
        if (meta) meta.content = val ?? 'light dark';
        setResolvedTheme(
          val === 'light' || val === 'dark' ? val : getSystemScheme()
        );
      }
    };

    mql.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      mql.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const applyThemeSelection = (targetScheme) => {
    const sys = getSystemScheme();
    const meta = document.querySelector('meta[name="color-scheme"]');
    try {
      if (targetScheme === sys) {
        // Target matches current system preference -> remove stored override
        localStorage.removeItem('color-scheme');
        if (meta) meta.content = 'light dark';
      } else {
        localStorage.setItem('color-scheme', targetScheme);
        if (meta) meta.content = targetScheme;
      }
    } catch (e) {
      if (meta) meta.content = targetScheme;
    }
    setResolvedTheme(targetScheme);
  };

  // Omnichannel Configuration State (Extended View)
  const [config, setConfig] = useState({
    plan: 'Enterprise',
    assignmentMethod: 'spare_capacity',
    queueOrder: 'priority',
    enableCustomQueues: true,
    enableSkills: true,
  });

  // Agents State
  const [agents, setAgents] = useState(INITIAL_AGENTS);

  // Selected Preset & Active Ticket State
  const [selectedPresetId, setSelectedPresetId] = useState(PRESET_SCENARIOS[0].id);
  const [activeTicket, setActiveTicket] = useState({ ...PRESET_SCENARIOS[0] });

  // Secondary Queue Tickets
  const [companionTickets] = useState([
    {
      id: '#1088',
      subject: 'Password reset webhook delay',
      channel: 'email',
      priority: 'Normal',
      slaMinutes: 28,
      createdAtOrder: 1,
      matchesCustomQueue: false,
    },
    {
      id: '#1089',
      subject: 'Billing VAT invoice correction',
      channel: 'messaging',
      priority: 'High',
      slaMinutes: 6,
      createdAtOrder: 3,
      matchesCustomQueue: false,
    },
  ]);

  // Step-by-Step Playback State (Extended View Steps 1 to 8)
  const [currentStep, setCurrentStep] = useState(8);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reassignment & Skills Timeout Toggles
  const [declinedAgentIds, setDeclinedAgentIds] = useState([]);
  const [skillsTimedOut, setSkillsTimedOut] = useState(false);
  const [offerTimerSeconds, setOfferTimerSeconds] = useState(30);
  const [ticketDeliveredCount, setTicketDeliveredCount] = useState(0);

  // Custom Ticket Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    customerName: 'Clara Lindqvist',
    customerTier: 'VIP End User',
    channel: 'email',
    viaSubtype: 'Email',
    subject: 'Urgent API token rotation failure',
    priority: 'Urgent',
    slaMinutes: 10,
    autoRoutingTag: true,
    assignedGroup: 'VIP Support',
    requiredSkill: 'German',
    skillIsOptional: true,
    matchesCustomQueue: true,
    customQueueName: 'VIP & Urgent Custom Queue',
    primaryGroup: 'VIP Support',
    fallbackGroup: 'Tech Tier 2',
  });

  const handleSelectPlan = (planKey) => {
    const planSpec = ZENDESK_PLANS[planKey];
    setConfig((prev) => ({
      ...prev,
      plan: planKey,
      enableCustomQueues: planSpec.supportsCustomQueues
        ? prev.enableCustomQueues
        : false,
      enableSkills: planSpec.supportsSkills ? prev.enableSkills : false,
      queueOrder: planSpec.queueOrderOptions.includes(prev.queueOrder)
        ? prev.queueOrder
        : planSpec.queueOrderOptions[0],
    }));
  };

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setActiveTicket({ ...preset });
    setDeclinedAgentIds([]);
    setSkillsTimedOut(false);
    setOfferTimerSeconds(30);
    setCurrentStep(1);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= 8) {
          setIsPlaying(false);
          return 8;
        }
        return prev + 1;
      });
    }, 1350);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const channelSpec = CHANNELS[activeTicket.channel] || CHANNELS.email;
  useEffect(() => {
    if (currentStep !== 8 || !channelSpec.hasOfferTimer) {
      setOfferTimerSeconds(30);
      return undefined;
    }
    const interval = setInterval(() => {
      setOfferTimerSeconds((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, activeTicket.channel, channelSpec.hasOfferTimer, declinedAgentIds]);

  const evaluation = useMemo(
    () =>
      evaluateOmnichannelRouting({
        ticket: activeTicket,
        agents,
        config,
        declinedAgentIds,
        skillsTimedOut,
        lang,
      }),
    [activeTicket, agents, config, declinedAgentIds, skillsTimedOut, lang]
  );

  const orderedQueuePreview = useMemo(() => {
    if (!evaluation.routable) return [];
    const mainItem = {
      id: '#1090',
      subject: activeTicket.subject,
      channel: activeTicket.channel,
      priority: activeTicket.priority,
      slaMinutes: activeTicket.slaMinutes,
      createdAtOrder: 2,
      matchesCustomQueue:
        config.enableCustomQueues && activeTicket.matchesCustomQueue,
      isCurrent: true,
    };
    return sortQueueTickets([mainItem, ...companionTickets], config);
  }, [activeTicket, companionTickets, config, evaluation.routable]);

  const cycleAgentStatus = (agentId) => {
    const planSpec = ZENDESK_PLANS[config.plan];
    const allowedStatuses = planSpec.supportsCustomStatus
      ? STATUS_ORDER
      : STATUS_ORDER.filter((s) => !UNIFIED_STATUSES[s].isCustom);

    setAgents((prev) =>
      prev.map((ag) => {
        if (ag.id !== agentId) return ag;
        const idx = allowedStatuses.indexOf(ag.status);
        const nextStatus = allowedStatuses[(idx + 1) % allowedStatuses.length];
        return { ...ag, status: nextStatus };
      })
    );
  };

  const toggleAgentSkill = (agentId, skillId) => {
    setAgents((prev) =>
      prev.map((ag) => {
        if (ag.id !== agentId) return ag;
        const has = ag.skills.includes(skillId);
        return {
          ...ag,
          skills: has
            ? ag.skills.filter((s) => s !== skillId)
            : [...ag.skills, skillId],
        };
      })
    );
  };

  const adjustAgentCapacity = (agentId, channelKey, delta) => {
    setAgents((prev) =>
      prev.map((ag) => {
        if (ag.id !== agentId) return ag;
        const current = ag.capacity[channelKey];
        const nextUsed = Math.max(
          0,
          Math.min(current.max, current.used + delta)
        );
        return {
          ...ag,
          capacity: {
            ...ag.capacity,
            [channelKey]: { ...current, used: nextUsed },
          },
        };
      })
    );
  };

  const handleSimulateDeclineOrTimeout = () => {
    if (!evaluation.winnerAgent) return;
    setDeclinedAgentIds((prev) => [...prev, evaluation.winnerAgent.id]);
    setOfferTimerSeconds(30);
  };

  const handleCommitAssignment = () => {
    if (!evaluation.winnerAgent) return;
    const winnerId = evaluation.winnerAgent.id;
    const ch = activeTicket.channel;
    adjustAgentCapacity(winnerId, ch, 1);
    setTicketDeliveredCount((c) => c + 1);
  };

  const handleResetSimulator = () => {
    setAgents(INITIAL_AGENTS);
    setConfig({
      plan: 'Enterprise',
      assignmentMethod: 'spare_capacity',
      queueOrder: 'priority',
      enableCustomQueues: true,
      enableSkills: true,
    });
    setSelectedPresetId(PRESET_SCENARIOS[0].id);
    setActiveTicket({ ...PRESET_SCENARIOS[0] });
    setDeclinedAgentIds([]);
    setSkillsTimedOut(false);
    setCurrentStep(8);
    setIsPlaying(false);
  };

  const groupEligibleCount = evaluation.agentEvaluations.filter(
    (e) => e.inTargetGroup && !e.wasDeclined
  ).length;
  const statusEligibleCount = evaluation.agentEvaluations.filter(
    (e) => e.statusEligible
  ).length;
  const skillEligibleCount = evaluation.agentEvaluations.filter(
    (e) => e.skillEligible
  ).length;
  const capacityEligibleCount = evaluation.agentEvaluations.filter(
    (e) => e.capacityEligible
  ).length;

  const activeStepDef =
    STEP_DEFINITIONS.find((s) => s.step === currentStep) || STEP_DEFINITIONS[7];

  const renderChannelIcon = (chKey, size = 22) => {
    switch (chKey) {
      case 'email':
        return <Mail size={size} />;
      case 'messaging':
        return <MessageSquare size={size} />;
      case 'call':
        return <PhoneCall size={size} />;
      case 'voicemail':
        return <Voicemail size={size} />;
      default:
        return <Mail size={size} />;
    }
  };

  return (
    <div className="app-shell">
      {/* 1. TOP HEADER WITH VIEW SWITCHER, LANGUAGE SWITCHER & THEME SWITCHER */}
      <header className="topbar">
        <div className="brand-cluster">
          <div className="zd-logo-mark" aria-hidden="true">
            <Zap size={22} />
          </div>
          <div className="brand-titles">
            <h1>
              {t.appTitle}
              <span className="brand-pill">{t.appBadge}</span>
            </h1>
            <p>{t.appSubtitle}</p>
          </div>
        </div>

        <div className="config-toolbar" role="region" aria-label="Simulator Controls">
          {/* View Mode Switcher: Simple vs Extended */}
          <div className="control-group">
            <span className="control-label">{t.modeLabel}</span>
            <button
              type="button"
              className={`seg-btn ${uiMode === 'simple' ? 'active-green' : ''}`}
              onClick={() => setUiMode('simple')}
            >
              <Workflow size={14} />
              {t.simpleMode}
            </button>
            <button
              type="button"
              className={`seg-btn ${uiMode === 'extended' ? 'active-green' : ''}`}
              onClick={() => setUiMode('extended')}
            >
              <LayoutGrid size={14} />
              {t.extendedMode}
            </button>
          </div>

          {/* Language Switcher: EN / ES */}
          <div className="control-group">
            <Globe size={13} color="var(--text-muted)" />
            <button
              type="button"
              className={`seg-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <button
              type="button"
              className={`seg-btn ${lang === 'es' ? 'active' : ''}`}
              onClick={() => setLang('es')}
            >
              ES
            </button>
          </div>

          {/* Theme Switcher: Light / Dark */}
          <div className="control-group">
            <button
              type="button"
              className={`seg-btn ${resolvedTheme === 'light' ? 'active' : ''}`}
              onClick={() => applyThemeSelection('light')}
            >
              <Sun size={13} />
              {t.themeLight}
            </button>
            <button
              type="button"
              className={`seg-btn ${resolvedTheme === 'dark' ? 'active' : ''}`}
              onClick={() => applyThemeSelection('dark')}
            >
              <Moon size={13} />
              {t.themeDark}
            </button>
          </div>

          {/* Extended Mode Configuration Controls */}
          {uiMode === 'extended' && (
            <>
              <div className="control-group">
                <span className="control-label">{t.suitePlan}</span>
                {Object.keys(ZENDESK_PLANS).map((planKey) => (
                  <button
                    key={planKey}
                    type="button"
                    className={`seg-btn ${config.plan === planKey ? 'active' : ''}`}
                    onClick={() => handleSelectPlan(planKey)}
                    title={ZENDESK_PLANS[planKey].summary[lang]}
                  >
                    {planKey}
                  </button>
                ))}
              </div>

              <div className="control-group">
                <span className="control-label">{t.assignBy}</span>
                <button
                  type="button"
                  className={`seg-btn ${
                    config.assignmentMethod === 'spare_capacity'
                      ? 'active-green'
                      : ''
                  }`}
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      assignmentMethod: 'spare_capacity',
                    }))
                  }
                >
                  {t.spareCapacity}
                </button>
                <button
                  type="button"
                  className={`seg-btn ${
                    config.assignmentMethod === 'round_robin'
                      ? 'active-green'
                      : ''
                  }`}
                  onClick={() =>
                    setConfig((c) => ({ ...c, assignmentMethod: 'round_robin' }))
                  }
                >
                  {t.roundRobin}
                </button>
              </div>

              <div className="control-group">
                <span className="control-label">{t.queueOrder}</span>
                <button
                  type="button"
                  disabled={
                    !ZENDESK_PLANS[config.plan].queueOrderOptions.includes(
                      'priority'
                    )
                  }
                  className={`seg-btn ${
                    config.queueOrder === 'priority' ? 'active' : ''
                  }`}
                  onClick={() =>
                    setConfig((c) => ({ ...c, queueOrder: 'priority' }))
                  }
                >
                  {t.priority}
                </button>
                <button
                  type="button"
                  disabled={
                    !ZENDESK_PLANS[config.plan].queueOrderOptions.includes('sla')
                  }
                  className={`seg-btn ${
                    config.queueOrder === 'sla' ? 'active' : ''
                  }`}
                  onClick={() => setConfig((c) => ({ ...c, queueOrder: 'sla' }))}
                >
                  {t.soonestSla}
                </button>
                <button
                  type="button"
                  className={`seg-btn ${
                    config.queueOrder === 'oldest' ? 'active' : ''
                  }`}
                  onClick={() =>
                    setConfig((c) => ({ ...c, queueOrder: 'oldest' }))
                  }
                >
                  {t.oldest}
                </button>
              </div>

              <button
                type="button"
                className="ctrl-btn"
                onClick={handleResetSimulator}
                title={t.reset}
              >
                <RotateCcw size={14} />
                {t.reset}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ============================================================
          MODE A: SIMPLE VIEW (CLEAN 7-STEP VISUAL DIAGRAM)
         ============================================================ */}
      {uiMode === 'simple' ? (
        <SimpleDiagramView
          lang={lang}
          onSwitchToExtended={() => setUiMode('extended')}
        />
      ) : (
        /* ============================================================
           MODE B: EXTENDED VIEW (FULL INTERACTIVE LAB & RULES)
           ============================================================ */
        <>
          {/* Scenario Preset Select Bar */}
          <section className="scenario-select-bar" aria-label="Preset Routing Scenarios">
            <div className="scenario-select-group">
              <label htmlFor="scenario-select-field" className="control-label">
                {t.scenarioSelectLabel}
              </label>
              <select
                id="scenario-select-field"
                className="scenario-select"
                value={selectedPresetId}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = PRESET_SCENARIOS.find((p) => p.id === val);
                  if (found) handleSelectPreset(found);
                }}
              >
                {PRESET_SCENARIOS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    [{preset.badge[lang]}] {preset.title[lang]}
                  </option>
                ))}
                {selectedPresetId === 'custom' && (
                  <option value="custom">
                    {t.customOptionLabel}: {activeTicket.subject}
                  </option>
                )}
              </select>
            </div>

            {(() => {
              const currentPreset = PRESET_SCENARIOS.find(
                (p) => p.id === selectedPresetId
              );
              return (
                <div className="scenario-select-summary">
                  <span
                    className="scenario-badge"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    <span style={{ color: CHANNELS[activeTicket.channel]?.color }}>
                      {renderChannelIcon(activeTicket.channel, 14)}
                    </span>
                    {currentPreset ? currentPreset.badge[lang] : t.customTicket}
                  </span>
                  <span className="scenario-sub">
                    {currentPreset ? currentPreset.subtitle[lang] : activeTicket.subject}
                  </span>
                </div>
              );
            })()}

            <button
              type="button"
              className="custom-ticket-btn"
              onClick={() => setShowCustomModal(true)}
            >
              <PlusCircle size={16} />
              <span>{t.customTicket}</span>
            </button>
          </section>

          {/* Main Interactive Pipeline Stage */}
          <main className="pipeline-stage-wrapper">
            <div className="stage-status-header">
              <div className="step-NowPlaying">
                <div className="step-number-pill">{currentStep}</div>
                <div className="step-text-wrap">
                  <h2>{activeStepDef.stageLabel[lang]}</h2>
                  <p>{activeStepDef.summary[lang]}</p>
                </div>
              </div>

              <div className="playback-controls">
                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep((s) => Math.max(1, s - 1));
                  }}
                  disabled={currentStep <= 1}
                >
                  <SkipBack size={14} />
                  {t.prev}
                </button>

                <button
                  type="button"
                  className="ctrl-btn primary-play"
                  onClick={() => {
                    if (isPlaying) {
                      setIsPlaying(false);
                    } else {
                      if (currentStep >= 8) setCurrentStep(1);
                      setIsPlaying(true);
                    }
                  }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying
                    ? t.pause
                    : currentStep >= 8
                    ? `${t.replay} 1→8`
                    : t.autoPlay}
                </button>

                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep((s) => Math.min(8, s + 1));
                  }}
                  disabled={currentStep >= 8}
                >
                  {t.next}
                  <SkipForward size={14} />
                </button>

                <button
                  type="button"
                  className="ctrl-btn"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentStep(8);
                  }}
                >
                  {t.jumpToEnd} (8)
                </button>
              </div>
            </div>

            {/* Animated SVG Routing Schematic Ribbon */}
            <VisualFlowRibbon
              activeTicket={activeTicket}
              agents={agents}
              evaluation={evaluation}
              currentStep={currentStep}
              onSelectStep={(st) => {
                setIsPlaying(false);
                setCurrentStep(st);
              }}
              onCycleAgentStatus={cycleAgentStatus}
              lang={lang}
            />

            {/* 4-Column Interactive Flow Diagram */}
            <div className="diagram-canvas">
              {/* COLUMN 1: STEPS 1 & 2 */}
              <div
                className={`stage-col ${
                  currentStep === 1 || currentStep === 2 ? 'col-active' : ''
                }`}
              >
                <div className="col-header">
                  <span className="col-step-tag">{t.steps12}</span>
                  <span className="col-title">{t.customerAndChannel}</span>
                </div>

                <div className="end-user-node">
                  <span className="vip-crown-badge">
                    {activeTicket.customerTier}
                  </span>
                  <div className="user-avatar-circle">
                    <Users size={24} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                    {activeTicket.customerName}
                  </div>
                  <div className="user-label-chip">{t.endUser}</div>
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-secondary)',
                      marginTop: '2px',
                    }}
                  >
                    “{activeTicket.subject}”
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: currentStep >= 2 ? '#059669' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    gap: '6px',
                  }}
                >
                  <span>
                    {t.submitsVia} {activeTicket.viaSubtype}
                  </span>
                  <ArrowRight size={14} style={{ rotate: '90deg' }} />
                </div>

                <div
                  className={`channel-envelope-box ${
                    currentStep === 2 ? 'active-pulse' : ''
                  }`}
                >
                  <div
                    className="channel-icon-badge"
                    style={{
                      background: channelSpec.bgLight,
                      border: `2px solid ${channelSpec.color}`,
                      color: channelSpec.color,
                    }}
                  >
                    {renderChannelIcon(activeTicket.channel, 26)}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                      {channelSpec.label[lang]}
                    </div>
                    <div
                      style={{
                        fontSize: '0.67rem',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      {channelSpec.ruleNote[lang]}
                    </div>
                  </div>

                  <div className="channel-switcher-mini">
                    {Object.values(CHANNELS).map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        className={`chan-mini-btn ${
                          activeTicket.channel === ch.id ? 'selected' : ''
                        }`}
                        onClick={() => {
                          setActiveTicket((tk) => ({
                            ...tk,
                            channel: ch.id,
                            viaSubtype: ch.subtypes[0],
                          }));
                          setDeclinedAgentIds([]);
                        }}
                      >
                        {renderChannelIcon(ch.id, 12)}
                        {ch.label[lang]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* COLUMN 2: STEP 3 — TRIGGERS */}
              <div className={`stage-col ${currentStep === 3 ? 'col-active' : ''}`}>
                <div className="col-header">
                  <span className="col-step-tag">{t.step3}</span>
                  <span className="col-title">{t.ticketTriggersFire}</span>
                </div>

                <div className="trigger-gear-box">
                  <div className="gear-circle">
                    <Settings
                      size={30}
                      className={currentStep === 3 || isPlaying ? 'gear-spinning' : ''}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      {t.autoEnrichmentRules}
                    </div>
                    <div
                      style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}
                    >
                      {t.clickBadgeHint}
                    </div>
                  </div>
                </div>

                <div
                  className="trigger-tag-stack"
                  style={{ opacity: currentStep >= 3 ? 1 : 0.45 }}
                >
                  <div
                    className={`trigger-tag-pill ${
                      activeTicket.autoRoutingTag ? 'tag-dark-kale' : ''
                    }`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Tag size={13} />
                      <div>
                        <div style={{ fontSize: '0.62rem', opacity: 0.8 }}>
                          {t.autoRoutingTag}
                        </div>
                        <div>
                          {activeTicket.autoRoutingTag
                            ? '#auto_route'
                            : t.noneMissing}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tag-toggle-btn"
                      onClick={() =>
                        setActiveTicket((tk) => ({
                          ...tk,
                          autoRoutingTag: !tk.autoRoutingTag,
                        }))
                      }
                    >
                      {activeTicket.autoRoutingTag ? t.removeTag : t.addTag}
                    </button>
                  </div>

                  <div className="trigger-tag-pill tag-group">
                    <div>
                      <div style={{ fontSize: '0.62rem', opacity: 0.75 }}>
                        {t.assignedGroup}
                      </div>
                      <div>{activeTicket.assignedGroup}</div>
                    </div>
                    <button
                      type="button"
                      className="tag-toggle-btn"
                      onClick={() => {
                        const idx = GROUP_ORDER.indexOf(activeTicket.assignedGroup);
                        const nextGroup =
                          GROUP_ORDER[(idx + 1) % GROUP_ORDER.length];
                        setActiveTicket((tk) => ({
                          ...tk,
                          assignedGroup: nextGroup,
                          primaryGroup: nextGroup,
                        }));
                      }}
                    >
                      {t.change}
                    </button>
                  </div>

                  <div className="trigger-tag-pill tag-priority-urgent">
                    <div>
                      <div style={{ fontSize: '0.62rem', opacity: 0.8 }}>
                        {t.priorityAndSla}
                      </div>
                      <div>
                        {activeTicket.priority.toUpperCase()} •{' '}
                        {activeTicket.slaMinutes}m SLA
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tag-toggle-btn"
                      onClick={() => {
                        const idx = PRIORITY_ORDER.indexOf(activeTicket.priority);
                        const nextPri =
                          PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
                        setActiveTicket((tk) => ({ ...tk, priority: nextPri }));
                      }}
                    >
                      {t.cycle}
                    </button>
                  </div>

                  <div className="trigger-tag-pill tag-skill">
                    <div>
                      <div style={{ fontSize: '0.62rem', opacity: 0.8 }}>
                        {t.requiredSkill} {!config.enableSkills && t.offInPlan}
                      </div>
                      <div>
                        {activeTicket.requiredSkill
                          ? `${
                              SKILLS_CATALOG.find(
                                (s) => s.id === activeTicket.requiredSkill
                              )?.flag || ''
                            } ${activeTicket.requiredSkill} ${
                              skillsTimedOut ? t.timedOut : ''
                            }`
                          : t.noneRequired}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tag-toggle-btn"
                      onClick={() => {
                        const idx = SKILL_CYCLE.indexOf(activeTicket.requiredSkill);
                        const nextSkill =
                          SKILL_CYCLE[(idx + 1) % SKILL_CYCLE.length];
                        setActiveTicket((tk) => ({
                          ...tk,
                          requiredSkill: nextSkill,
                        }));
                        setSkillsTimedOut(false);
                      }}
                    >
                      {t.cycle}
                    </button>
                  </div>
                </div>
              </div>

              {/* COLUMN 3: STEPS 4 & 5 — QUEUES & FILTERS */}
              <div
                className={`stage-col ${
                  currentStep === 4 || currentStep === 5 ? 'col-active' : ''
                }`}
              >
                <div className="col-header">
                  <span className="col-step-tag">{t.steps45}</span>
                  <span className="col-title">{t.queuesAndFilters}</span>
                </div>

                {!evaluation.routable ? (
                  <div className="queue-lane lane-blocked">
                    <div className="queue-lane-top">
                      <span
                        className="queue-lane-title"
                        style={{ color: '#e11d48' }}
                      >
                        <ShieldAlert size={16} />
                        {evaluation.bypassTitle}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: '0.73rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.4,
                      }}
                    >
                      {evaluation.bypassDetail}
                    </p>
                    {evaluation.bypassReason === 'missing_tag' && (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button
                          type="button"
                          className="ctrl-btn primary-play"
                          style={{ fontSize: '0.7rem', padding: '5px 10px' }}
                          onClick={() =>
                            setActiveTicket((tk) => ({
                              ...tk,
                              autoRoutingTag: true,
                            }))
                          }
                        >
                          {t.addAutoRouteBtn}
                        </button>
                        {ZENDESK_PLANS[config.plan].supportsCustomQueues && (
                          <button
                            type="button"
                            className="ctrl-btn"
                            style={{ fontSize: '0.7rem', padding: '5px 10px' }}
                            onClick={() => {
                              setConfig((c) => ({
                                ...c,
                                enableCustomQueues: true,
                              }));
                              setActiveTicket((tk) => ({
                                ...tk,
                                matchesCustomQueue: true,
                                customQueueName: 'Custom Email Queue',
                              }));
                            }}
                          >
                            {t.matchCustomQueueBtn}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className={`queue-lane ${
                        evaluation.queueType === 'custom' ? 'lane-selected' : ''
                      }`}
                    >
                      <div className="queue-lane-top">
                        <span className="queue-lane-title">
                          <Sparkles size={14} color="#10b981" />
                          {t.customQueue}
                        </span>
                        <button
                          type="button"
                          className="tag-toggle-btn"
                          disabled={
                            !ZENDESK_PLANS[config.plan].supportsCustomQueues
                          }
                          onClick={() =>
                            setActiveTicket((tk) => ({
                              ...tk,
                              matchesCustomQueue: !tk.matchesCustomQueue,
                            }))
                          }
                        >
                          {evaluation.queueType === 'custom'
                            ? t.matchedPriority1
                            : t.bypassed}
                        </button>
                      </div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {t.primaryLabel}: <strong>{activeTicket.primaryGroup}</strong>
                        {activeTicket.fallbackGroup && (
                          <>
                            {' '}
                            → {t.fallbackLabel}:{' '}
                            <strong>{activeTicket.fallbackGroup}</strong>
                          </>
                        )}
                      </div>
                      {evaluation.usedFallbackGroup && (
                        <div
                          style={{
                            fontSize: '0.66rem',
                            color: '#d97706',
                            background: 'rgba(245, 158, 11, 0.14)',
                            padding: '3px 7px',
                          }}
                        >
                          ⚡ {t.overflowNotice} ({evaluation.activeGroup})!
                        </div>
                      )}
                    </div>

                    <div
                      className={`queue-lane ${
                        evaluation.queueType === 'standard' ? 'lane-selected' : ''
                      }`}
                    >
                      <div className="queue-lane-top">
                        <span className="queue-lane-title">
                          <Layers size={14} color="#0284c7" />
                          {t.standardQueue}
                        </span>
                        <span
                          className="queue-priority-chip"
                          style={{
                            background: 'rgba(2, 132, 199, 0.14)',
                            color: '#0284c7',
                          }}
                        >
                          {evaluation.queueType === 'standard'
                            ? t.activeWord
                            : t.fallbackWord}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {t.routesToGroup} (
                        <strong>{activeTicket.assignedGroup}</strong>)
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>
                          {t.queueOrder} ({config.queueOrder.toUpperCase()})
                        </span>
                        <span>{t.frontUp}</span>
                      </div>
                      {orderedQueuePreview.slice(0, 2).map((qt, idx) => (
                        <div
                          key={qt.id}
                          className="ticket-token-mini"
                          style={{
                            borderLeftColor: qt.isCurrent ? '#10b981' : '#64748b',
                            opacity: qt.isCurrent ? 1 : 0.65,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 800,
                                color: qt.isCurrent ? '#059669' : '#64748b',
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <span
                              style={{
                                maxWidth: '125px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {qt.subject}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {qt.priority} • {qt.slaMinutes}m
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="ocr-gates-box">
                  <div
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.liveFunnelTitle}
                  </div>
                  <div
                    className={`gate-row ${
                      currentStep === 6
                        ? 'gate-active'
                        : currentStep > 6
                        ? 'gate-passed'
                        : ''
                    }`}
                  >
                    <span>
                      {t.unifiedStatusGate} ({channelSpec.label[lang]})
                    </span>
                    <span>
                      {statusEligibleCount}/{groupEligibleCount} {t.availableWord}
                    </span>
                  </div>
                  <div
                    className={`gate-row ${
                      currentStep === 7
                        ? 'gate-active'
                        : currentStep > 7
                        ? 'gate-passed'
                        : ''
                    }`}
                  >
                    <span>
                      {t.skillsGate} (
                      {evaluation.effectiveSkillRequired || t.anySkill})
                    </span>
                    <span>
                      {skillEligibleCount}/{statusEligibleCount} {t.matchedWord}
                    </span>
                  </div>
                  <div
                    className={`gate-row ${
                      currentStep === 8 ? 'gate-passed' : ''
                    }`}
                  >
                    <span>
                      8.{' '}
                      {config.assignmentMethod === 'round_robin'
                        ? t.roundRobinIdle
                        : t.spareCapacity}
                    </span>
                    <span>
                      {evaluation.winnerAgent
                        ? `→ ${evaluation.winnerAgent.name.split(' ')[0]}`
                        : `${capacityEligibleCount} ${t.freeWord}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* COLUMN 4: STEPS 6, 7 & 8 — AGENT POOL */}
              <div
                className={`stage-col agent-pool-stage ${
                  currentStep >= 6 && evaluation.winnerAgent
                    ? 'col-winner'
                    : currentStep >= 6
                    ? 'col-active'
                    : ''
                }`}
              >
                <div className="col-header">
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span className="col-step-tag">{t.steps68}</span>
                    <span className="col-title">{t.agentPoolTitle}</span>
                  </div>

                  {activeTicket.requiredSkill && !skillsTimedOut && (
                    <button
                      type="button"
                      className="tag-toggle-btn"
                      onClick={() => setSkillsTimedOut(true)}
                    >
                      <Clock size={11} style={{ marginRight: '4px' }} />
                      {t.triggerSkillsTimeout}
                    </button>
                  )}
                  {skillsTimedOut && (
                    <button
                      type="button"
                      className="tag-toggle-btn"
                      onClick={() => setSkillsTimedOut(false)}
                    >
                      {t.resetSkillsTimeout}
                    </button>
                  )}
                </div>

                <div className="agent-network-container">
                  {agents.map((agent) => {
                    const ev = evaluation.agentEvaluations.find(
                      (e) => e.agentId === agent.id
                    );
                    const stSpec =
                      UNIFIED_STATUSES[agent.status] || UNIFIED_STATUSES.offline;

                    let isEliminated = false;
                    let isCandidate = false;
                    let isWinner = false;

                    if (!evaluation.routable) {
                      isEliminated = currentStep >= 4;
                    } else if (currentStep === 5) {
                      isEliminated = !ev.inTargetGroup || ev.wasDeclined;
                      isCandidate = ev.inTargetGroup && !ev.wasDeclined;
                    } else if (currentStep === 6) {
                      isEliminated = !ev.statusEligible;
                      isCandidate = ev.statusEligible;
                    } else if (currentStep === 7) {
                      isEliminated = !ev.skillEligible;
                      isCandidate = ev.skillEligible;
                    } else if (currentStep >= 8) {
                      isWinner = ev.isWinner;
                      isEliminated = !ev.isWinner;
                    }

                    return (
                      <div
                        key={agent.id}
                        className={`agent-card ${
                          isWinner
                            ? 'agent-winner'
                            : isCandidate
                            ? 'agent-candidate'
                            : isEliminated
                            ? 'agent-eliminated'
                            : ''
                        }`}
                      >
                        <div className="agent-top-row">
                          <div className="agent-identity">
                            <div
                              className="agent-portrait-ring"
                              style={{
                                border: `2px solid ${stSpec.dotColor}`,
                              }}
                            >
                              <div
                                className="agent-portrait-inner"
                                style={{ background: agent.avatarBg }}
                              >
                                {agent.avatar}
                              </div>
                              <span
                                className="status-dot-indicator"
                                style={{ backgroundColor: stSpec.dotColor }}
                              />
                            </div>
                            <div className="agent-name-block">
                              <h4>
                                {agent.name}
                                {isWinner && <Award size={15} color="#10b981" />}
                              </h4>
                              <span>{agent.groups.join(' • ')}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="status-cycle-btn"
                            style={{ backgroundColor: stSpec.color }}
                            onClick={() => cycleAgentStatus(agent.id)}
                          >
                            <span>●</span>
                            {stSpec.label[lang]}
                          </button>
                        </div>

                        <div className="agent-tags-row">
                          <span
                            style={{
                              fontSize: '0.63rem',
                              color: 'var(--text-muted)',
                              fontWeight: 700,
                            }}
                          >
                            {t.skillsLabel}
                          </span>
                          {SKILLS_CATALOG.map((sk) => {
                            const hasSkill = agent.skills.includes(sk.id);
                            const isMatchedSkill =
                              hasSkill &&
                              evaluation.effectiveSkillRequired === sk.id &&
                              currentStep >= 7;
                            return (
                              <button
                                key={sk.id}
                                type="button"
                                className={`skill-chip ${
                                  isMatchedSkill
                                    ? 'skill-matched-highlight'
                                    : hasSkill
                                    ? 'has-skill'
                                    : ''
                                }`}
                                onClick={() => toggleAgentSkill(agent.id, sk.id)}
                              >
                                {sk.flag} {sk.id}
                              </button>
                            );
                          })}
                        </div>

                        <div className="capacity-bars-grid">
                          {['email', 'messaging', 'call'].map((chKey) => {
                            const cap = agent.capacity[chKey];
                            const pctUsed =
                              cap.max > 0
                                ? Math.round((cap.used / cap.max) * 100)
                                : 100;
                            const pctSpare = 100 - pctUsed;
                            const isTicketChannel =
                              activeTicket.channel === chKey;
                            const barColor =
                              pctSpare === 0
                                ? '#f43f5e'
                                : isTicketChannel
                                ? '#10b981'
                                : '#0284c7';

                            return (
                              <div
                                key={chKey}
                                className={`cap-mini-box ${
                                  isTicketChannel ? 'active-channel-box' : ''
                                }`}
                              >
                                <div className="cap-top-line">
                                  <span style={{ textTransform: 'capitalize' }}>
                                    {chKey === 'messaging' ? 'Msg' : chKey}
                                  </span>
                                  <span>
                                    {cap.used}/{cap.max}
                                  </span>
                                </div>
                                <div className="cap-progress-track">
                                  <div
                                    className="cap-progress-fill"
                                    style={{
                                      width: `${pctUsed}%`,
                                      backgroundColor: barColor,
                                    }}
                                  />
                                </div>
                                <div className="cap-adjust-btns">
                                  <span>
                                    {pctSpare}% {t.freePct}
                                  </span>
                                  <div style={{ display: 'flex', gap: '3px' }}>
                                    <button
                                      type="button"
                                      className="tiny-step-btn"
                                      disabled={cap.used <= 0}
                                      onClick={() =>
                                        adjustAgentCapacity(agent.id, chKey, -1)
                                      }
                                    >
                                      -
                                    </button>
                                    <button
                                      type="button"
                                      className="tiny-step-btn"
                                      disabled={cap.used >= cap.max}
                                      onClick={() =>
                                        adjustAgentCapacity(agent.id, chKey, 1)
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div
                          className={`agent-verdict-banner ${
                            isWinner
                              ? 'verdict-winner'
                              : isEliminated
                              ? 'verdict-eliminated'
                              : 'verdict-eligible'
                          }`}
                        >
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            {isWinner ? (
                              <CheckCircle2 size={14} />
                            ) : isEliminated ? (
                              <XCircle size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                            {currentStep < 5
                              ? `${t.idleAgo} ${Math.floor(
                                  ev.idleSeconds / 60
                                )}${t.minAgo}`
                              : ev.reasonBadge}
                          </span>
                          {isWinner && (
                            <span
                              style={{
                                fontSize: '0.64rem',
                                background: 'rgba(16, 185, 129, 0.25)',
                                padding: '2px 6px',
                              }}
                            >
                              {t.routedBadge}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {currentStep >= 8 && evaluation.routable && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '9px 12px',
                      background: evaluation.winnerAgent
                        ? 'rgba(16, 185, 129, 0.14)'
                        : 'rgba(245, 158, 11, 0.15)',
                      border: `1px solid ${
                        evaluation.winnerAgent
                          ? 'rgba(16, 185, 129, 0.4)'
                          : 'rgba(245, 158, 11, 0.45)'
                      }`,
                      flexWrap: 'wrap',
                    }}
                  >
                    {evaluation.winnerAgent ? (
                      <>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.76rem',
                          }}
                        >
                          <CheckCircle2 size={16} color="#10b981" />
                          <span>
                            {t.ticketAssignedTo}{' '}
                            <strong>{evaluation.winnerAgent.name}</strong>
                            {evaluation.usedFallbackGroup &&
                              ` (${t.viaFallbackGroup}: ${evaluation.activeGroup})`}
                            !
                          </span>
                          {channelSpec.hasOfferTimer && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 7px',
                                background: 'rgba(245, 158, 11, 0.22)',
                                color: '#d97706',
                                fontWeight: 700,
                              }}
                            >
                              ⏱ {t.offerWindow}: {offerTimerSeconds}s
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {channelSpec.hasOfferTimer && (
                            <button
                              type="button"
                              className="ctrl-btn warn-action"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.72rem',
                              }}
                              onClick={handleSimulateDeclineOrTimeout}
                            >
                              <RefreshCw size={13} />
                              {t.simulateTimeoutBtn}
                            </button>
                          )}
                          <button
                            type="button"
                            className="ctrl-btn primary-play"
                            style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                            onClick={handleCommitAssignment}
                          >
                            {t.addLoadBtn}{' '}
                            {evaluation.winnerAgent.name.split(' ')[0]}
                            {ticketDeliveredCount > 0 &&
                              ` (${ticketDeliveredCount})`}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          gap: '8px',
                          fontSize: '0.75rem',
                        }}
                      >
                        <span>
                          ⏳{' '}
                          <strong>
                            {t.waitingInQueue} {evaluation.queueName}:
                          </strong>{' '}
                          {t.waitingDetail}
                        </span>
                        {declinedAgentIds.length > 0 && (
                          <button
                            type="button"
                            className="ctrl-btn"
                            style={{ padding: '4px 9px', fontSize: '0.7rem' }}
                            onClick={() => setDeclinedAgentIds([])}
                          >
                            {t.clearDeclinedBtn}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom 1 -> 8 Numbered Timeline Bar */}
            <nav
              className="numbered-timeline"
              aria-label="8-Step Omnichannel Routing Storyboard"
            >
              {STEP_DEFINITIONS.map((stepObj, idx) => {
                const isCurrent = currentStep === stepObj.step;
                const isDone = currentStep > stepObj.step;
                return (
                  <div key={stepObj.step} className="timeline-step-item">
                    <button
                      type="button"
                      className={`timeline-node-btn ${
                        isCurrent ? 'step-current' : isDone ? 'step-done' : ''
                      }`}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStep(stepObj.step);
                      }}
                    >
                      <div className="timeline-circle">{stepObj.step}</div>
                      <span className="timeline-label">
                        {stepObj.shortTitle[lang]}
                      </span>
                    </button>
                    {idx < STEP_DEFINITIONS.length - 1 && (
                      <div
                        className={`timeline-dotted-arrow ${
                          isDone ? 'arrow-lit' : ''
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </nav>
          </main>

          {/* Bottom Rules & Plan Reference Cards */}
          <section
            className="bottom-panels-grid"
            aria-label="Omnichannel Rules Quick Reference"
          >
            <div className="info-panel">
              <div className="panel-title-row">
                <h3>
                  <Sliders size={16} color="#0284c7" />
                  {t.coreRulesTitle}
                </h3>
              </div>
              <div className="rules-cards-row">
                <div className="mini-rule-card">
                  <h4>
                    <span style={{ color: '#10b981' }}>●</span> {t.rule1Title}
                  </h4>
                  <p>{t.rule1Body}</p>
                </div>
                <div className="mini-rule-card">
                  <h4>
                    <span style={{ color: '#0284c7' }}>●</span> {t.rule2Title}
                  </h4>
                  <p>{t.rule2Body}</p>
                </div>
                <div className="mini-rule-card">
                  <h4>
                    <span style={{ color: '#a855f7' }}>●</span> {t.rule3Title}
                  </h4>
                  <p>{t.rule3Body}</p>
                </div>
              </div>
            </div>

            <div className="info-panel">
              <div className="panel-title-row">
                <h3>
                  <Sparkles size={16} color="#10b981" />
                  {t.activePlanLabel} {ZENDESK_PLANS[config.plan].name}
                </h3>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    background: 'rgba(16, 185, 129, 0.16)',
                    color: '#059669',
                    fontWeight: 700,
                  }}
                >
                  {ZENDESK_PLANS[config.plan].customStatusLimit > 0
                    ? `${t.customStatusesUpTo} ${
                        ZENDESK_PLANS[config.plan].customStatusLimit
                      }`
                    : t.defaultUnifiedStatuses}
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                {ZENDESK_PLANS[config.plan].summary[lang]}
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: 'auto',
                }}
              >
                <span
                  className="scenario-badge"
                  style={{
                    background: ZENDESK_PLANS[config.plan].supportsCustomQueues
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'rgba(148, 163, 184, 0.12)',
                    color: ZENDESK_PLANS[config.plan].supportsCustomQueues
                      ? '#059669'
                      : 'var(--text-muted)',
                  }}
                >
                  {ZENDESK_PLANS[config.plan].supportsCustomQueues ? '✓' : '✕'}{' '}
                  {t.customQueuesBadge}
                </span>
                <span
                  className="scenario-badge"
                  style={{
                    background: ZENDESK_PLANS[config.plan].supportsSkills
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'rgba(148, 163, 184, 0.12)',
                    color: ZENDESK_PLANS[config.plan].supportsSkills
                      ? '#059669'
                      : 'var(--text-muted)',
                  }}
                >
                  {ZENDESK_PLANS[config.plan].supportsSkills ? '✓' : '✕'}{' '}
                  {t.skillsRoutingBadge}
                </span>
                <span
                  className="scenario-badge"
                  style={{
                    background: ZENDESK_PLANS[config.plan].reopenReassign
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'rgba(148, 163, 184, 0.12)',
                    color: ZENDESK_PLANS[config.plan].reopenReassign
                      ? '#059669'
                      : 'var(--text-muted)',
                  }}
                >
                  {ZENDESK_PLANS[config.plan].reopenReassign ? '✓' : '✕'}{' '}
                  {t.reopenReassignBadge}
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Accessible semantic data table for screen readers */}
      <table className="sr-only">
        <caption>Omnichannel Routing Agent Pool Status and Capacity</caption>
        <thead>
          <tr>
            <th>Agent</th>
            <th>Unified Status</th>
            <th>Skills</th>
            <th>Email Capacity</th>
            <th>Messaging Capacity</th>
            <th>Call Capacity</th>
            <th>Routing Evaluation</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((ag) => {
            const ev = evaluation.agentEvaluations.find(
              (e) => e.agentId === ag.id
            );
            return (
              <tr key={ag.id}>
                <td>{ag.name}</td>
                <td>{ag.status}</td>
                <td>{ag.skills.join(', ')}</td>
                <td>
                  {ag.capacity.email.used}/{ag.capacity.email.max}
                </td>
                <td>
                  {ag.capacity.messaging.used}/{ag.capacity.messaging.max}
                </td>
                <td>
                  {ag.capacity.call.used}/{ag.capacity.call.max}
                </td>
                <td>{ev?.reasonBadge}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Custom Ticket Builder Modal */}
      {showCustomModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCustomModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-ticket-modal-title"
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 id="custom-ticket-modal-title" style={{ fontSize: '0.96rem' }}>
                {t.modalTitle}
              </h3>
              <button
                type="button"
                className="tag-toggle-btn"
                onClick={() => setShowCustomModal(false)}
              >
                {t.closeBtn}
              </button>
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="cust-name">{t.customerNameLabel}</label>
                <input
                  id="cust-name"
                  className="form-input"
                  value={customDraft.customerName}
                  onChange={(e) =>
                    setCustomDraft((d) => ({
                      ...d,
                      customerName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="cust-channel">{t.channelLabel}</label>
                <select
                  id="cust-channel"
                  className="form-select"
                  value={customDraft.channel}
                  onChange={(e) => {
                    const ch = e.target.value;
                    setCustomDraft((d) => ({
                      ...d,
                      channel: ch,
                      viaSubtype: CHANNELS[ch]?.subtypes[0] || 'Email',
                    }));
                  }}
                >
                  <option value="email">Email / Web Form / API</option>
                  <option value="messaging">Messaging / WhatsApp / Chat</option>
                  <option value="call">Talk Call (Inbound Live)</option>
                  <option value="voicemail">Voicemail (After-Hours)</option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="cust-priority">{t.ticketPriorityLabel}</label>
                <select
                  id="cust-priority"
                  className="form-select"
                  value={customDraft.priority}
                  onChange={(e) =>
                    setCustomDraft((d) => ({ ...d, priority: e.target.value }))
                  }
                >
                  {PRIORITY_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="cust-group">{t.assignedGroupLabel}</label>
                <select
                  id="cust-group"
                  className="form-select"
                  value={customDraft.assignedGroup}
                  onChange={(e) =>
                    setCustomDraft((d) => ({
                      ...d,
                      assignedGroup: e.target.value,
                      primaryGroup: e.target.value,
                    }))
                  }
                >
                  {GROUP_ORDER.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="cust-skill">{t.requiredSkillLabel}</label>
                <select
                  id="cust-skill"
                  className="form-select"
                  value={customDraft.requiredSkill || ''}
                  onChange={(e) =>
                    setCustomDraft((d) => ({
                      ...d,
                      requiredSkill: e.target.value || null,
                    }))
                  }
                >
                  <option value="">{t.noneRequired}</option>
                  {SKILLS_CATALOG.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.flag} {s.label[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="cust-queue">{t.queueMatchingLabel}</label>
                <select
                  id="cust-queue"
                  className="form-select"
                  value={customDraft.matchesCustomQueue ? 'custom' : 'standard'}
                  onChange={(e) =>
                    setCustomDraft((d) => ({
                      ...d,
                      matchesCustomQueue: e.target.value === 'custom',
                    }))
                  }
                >
                  <option value="custom">{t.matchCustomQueueOpt}</option>
                  <option value="standard">{t.standardQueueOnlyOpt}</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="cust-subject">{t.issueSummaryLabel}</label>
              <input
                id="cust-subject"
                className="form-input"
                value={customDraft.subject}
                onChange={(e) =>
                  setCustomDraft((d) => ({ ...d, subject: e.target.value }))
                }
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '6px',
              }}
            >
              <button
                type="button"
                className="ctrl-btn"
                onClick={() => setShowCustomModal(false)}
              >
                {t.cancelBtn}
              </button>
              <button
                type="button"
                className="ctrl-btn primary-play"
                onClick={() => {
                  setSelectedPresetId('custom');
                  setActiveTicket({ ...customDraft, id: 'custom-ticket' });
                  setDeclinedAgentIds([]);
                  setSkillsTimedOut(false);
                  setShowCustomModal(false);
                  setCurrentStep(1);
                  setIsPlaying(true);
                }}
              >
                <Play size={14} />
                {t.launchAnimateBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
