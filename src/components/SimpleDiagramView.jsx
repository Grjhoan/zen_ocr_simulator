import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sliders,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { SIMPLE_STEPS, UI_STRINGS } from '../data/scenarios';

/**
 * Simple / Light Version of the Zendesk Omnichannel Routing Simulator.
 * Modeled directly on the clean 7-step visual diagram screenshot:
 * 1. END USER -> 2. CHANNEL -> 3. TRIGGER GEAR & TAGS -> 4. GROUP TICKETS ->
 * 5. ASSIGNMENT CRITERIA -> 6. AVAILABLE AGENTS -> 7. MOST CAPACITY
 */
export default function SimpleDiagramView({
  lang = 'en',
  onSwitchToExtended,
}) {
  const t = UI_STRINGS[lang] || UI_STRINGS.en;

  // Interactive state for the Simple Diagram
  const [step, setStep] = useState(7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('email'); // 'messaging' | 'email'
  const [selectedPriority, setSelectedPriority] = useState('urgent'); // 'urgent' | 'high' | 'low'

  // 3 Agents matching the screenshot's vertical stack:
  // Index 0 (Top): Offline / Unavailable by default
  // Index 1 (Middle): Online & Available (55% spare capacity)
  // Index 2 (Bottom): Online & Available (90% spare capacity -> Most Capacity Winner!)
  const [simpleAgents, setSimpleAgents] = useState([
    {
      id: 'simple-1',
      name: 'Clara',
      online: false,
      sparePct: 40,
      y: 205,
    },
    {
      id: 'simple-2',
      name: 'Maya',
      online: true,
      sparePct: 55,
      y: 330,
    },
    {
      id: 'simple-3',
      name: 'David',
      online: true,
      sparePct: 90,
      y: 455,
    },
  ]);

  // Auto-play through steps 1 -> 7
  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(() => {
      setStep((prev) => {
        if (prev >= 7) {
          setIsPlaying(false);
          return 7;
        }
        return prev + 1;
      });
    }, 1350);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Determine available agents and the agent with the most capacity
  const availableAgents = simpleAgents.filter((a) => a.online);
  const winnerAgent =
    availableAgents.length > 0
      ? [...availableAgents].sort((a, b) => b.sparePct - a.sparePct)[0]
      : null;

  // Toggle an agent's online/offline status or cycle who has most capacity when clicked
  const handleAgentClick = (clickedId) => {
    setSimpleAgents((prev) => {
      const target = prev.find((a) => a.id === clickedId);
      if (!target) return prev;
      // If offline, turn online; if online and not highest capacity, boost capacity; otherwise toggle offline (keeping at least 1 online)
      const onlineCount = prev.filter((a) => a.online).length;
      if (!target.online) {
        return prev.map((a) =>
          a.id === clickedId ? { ...a, online: true } : a
        );
      }
      if (winnerAgent && winnerAgent.id !== clickedId) {
        // Make this clicked online agent the one with the MOST capacity!
        const maxPct = Math.max(...prev.map((a) => a.sparePct));
        return prev.map((a) =>
          a.id === clickedId
            ? { ...a, sparePct: Math.min(98, maxPct + 10) }
            : { ...a, sparePct: Math.max(30, a.sparePct - 15) }
        );
      }
      if (onlineCount > 1) {
        return prev.map((a) =>
          a.id === clickedId ? { ...a, online: false } : a
        );
      }
      return prev;
    });
  };

  const handleResetSimple = () => {
    setSelectedChannel('email');
    setSelectedPriority('urgent');
    setSimpleAgents([
      { id: 'simple-1', name: 'Clara', online: false, sparePct: 40, y: 205 },
      { id: 'simple-2', name: 'Maya', online: true, sparePct: 55, y: 330 },
      { id: 'simple-3', name: 'David', online: true, sparePct: 90, y: 455 },
    ]);
    setStep(1);
    setIsPlaying(true);
  };

  const activeStepDef =
    SIMPLE_STEPS.find((s) => s.step === step) || SIMPLE_STEPS[6];

  // Dynamic Y coordinate of selected channel (Messaging = 192, Email = 325)
  const channelY = selectedChannel === 'messaging' ? 192 : 325;

  // Dynamic Y coordinate of selected ticket priority card header (Urgent = 162, High = 287, Low = 412)
  const priorityHeaderY =
    selectedPriority === 'urgent'
      ? 162
      : selectedPriority === 'high'
      ? 287
      : 412;

  // Paths for each stage so we can animate both the stroke and a traveling orb
  const pathStep1To2 = `M 103 255 L 125 255 Q 140 255 140 ${
    255 + (channelY - 255) * 0.5
  } L 140 ${channelY} L 182 ${channelY}`;
  const pathStep2To3 = `M 258 ${channelY} L 305 ${channelY} L 305 325 L 336 325`;
  const pathStep3To4 = `M 404 325 L 442 325 L 442 ${priorityHeaderY} L 463 ${priorityHeaderY}`;
  const pathStep4To5 = `M 559 ${priorityHeaderY} L 622 162`;

  // Render an illustrated SVG agent portrait inside a circle centered at (0,0)
  const renderAgentPortrait = (agentId) => {
    if (agentId === 'simple-1') {
      // Top Agent (Clara - glasses & bob hair)
      return (
        <g>
          <circle cx="0" cy="0" r="33" fill="#dce3e8" />
          {/* Shoulders */}
          <path d="M -26 32 C -22 14, 22 14, 26 32 Z" fill="#64748b" />
          {/* Hair back */}
          <path d="M -20 -4 C -22 -26, 22 -26, 20 -4 L 22 14 L -22 14 Z" fill="#475569" />
          {/* Face */}
          <circle cx="0" cy="-2" r="13.5" fill="#f1d2b6" />
          {/* Glasses */}
          <rect x="-10" y="-6" width="8" height="6" rx="2" fill="none" stroke="#334155" strokeWidth="1.5" />
          <rect x="2" y="-6" width="8" height="6" rx="2" fill="none" stroke="#334155" strokeWidth="1.5" />
          <line x1="-2" y1="-3" x2="2" y2="-3" stroke="#334155" strokeWidth="1.5" />
          {/* Smile */}
          <path d="M -4 5 Q 0 8 4 5" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    }
    if (agentId === 'simple-2') {
      // Middle Agent (Maya - curly dark hair & warm smile)
      return (
        <g>
          <circle cx="0" cy="0" r="33" fill="#c7e6de" />
          {/* Shoulders */}
          <path d="M -26 32 C -22 14, 22 14, 26 32 Z" fill="#0f766e" />
          {/* Curly Hair */}
          <circle cx="-14" cy="-8" r="10" fill="#1e293b" />
          <circle cx="14" cy="-8" r="10" fill="#1e293b" />
          <circle cx="0" cy="-16" r="11" fill="#1e293b" />
          <circle cx="-16" cy="4" r="9" fill="#1e293b" />
          <circle cx="16" cy="4" r="9" fill="#1e293b" />
          {/* Face */}
          <circle cx="0" cy="-1" r="13.5" fill="#c6865c" />
          {/* Eyes */}
          <circle cx="-5" cy="-3" r="1.7" fill="#0f172a" />
          <circle cx="5" cy="-3" r="1.7" fill="#0f172a" />
          {/* Bright Smile */}
          <path d="M -5 4 Q 0 9 5 4 Z" fill="#ffffff" />
        </g>
      );
    }
    // Bottom Agent (David - glasses, bald/short crop, warm smile)
    return (
      <g>
        <circle cx="0" cy="0" r="33" fill="#d9e8f5" />
        {/* Shoulders */}
        <path d="M -26 32 C -22 14, 22 14, 26 32 Z" fill="#03363d" />
        {/* Head */}
        <circle cx="0" cy="-2" r="14.5" fill="#b97a50" />
        {/* Glasses */}
        <rect x="-11" y="-6" width="9" height="6.5" rx="2" fill="none" stroke="#0f172a" strokeWidth="1.8" />
        <rect x="2" y="-6" width="9" height="6.5" rx="2" fill="none" stroke="#0f172a" strokeWidth="1.8" />
        <line x1="-2" y1="-3" x2="2" y2="-3" stroke="#0f172a" strokeWidth="1.8" />
        {/* Smile */}
        <path d="M -5 5 Q 0 9 5 5" fill="none" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  };

  return (
    <main className="simple-stage-card">
      {/* Top Playback & Step Explanation Bar */}
      <div className="stage-status-header">
        <div className="step-NowPlaying">
          <div className="step-number-pill">{step}</div>
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
              setStep((s) => Math.max(1, s - 1));
            }}
            disabled={step <= 1}
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
                if (step >= 7) setStep(1);
                setIsPlaying(true);
              }
            }}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            {isPlaying ? t.pause : step >= 7 ? `${t.replay} 1→7` : t.autoPlay}
          </button>

          <button
            type="button"
            className="ctrl-btn"
            onClick={() => {
              setIsPlaying(false);
              setStep((s) => Math.min(7, s + 1));
            }}
            disabled={step >= 7}
          >
            {t.next}
            <SkipForward size={14} />
          </button>

          <button
            type="button"
            className="ctrl-btn"
            onClick={handleResetSimple}
            title={t.reset}
          >
            <RotateCcw size={14} />
            {t.reset}
          </button>
        </div>
      </div>

      {/* MAIN CLEAN SVG DIAGRAM (MATCHING USER SCREENSHOT) */}
      <div className="simple-svg-wrapper">
        <svg
          viewBox="0 0 1020 620"
          className="simple-diagram-svg"
          role="img"
          aria-label={t.simpleModeHint}
        >
          <defs>
            <clipPath id="agentClip">
              <circle cx="0" cy="0" r="33" />
            </clipPath>
            <filter id="cardDropShadow" x="-15%" y="-15%" width="130%" height="135%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" />
            </filter>
            <filter id="orbGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ============================================================
              COLUMN BACKGROUNDS & DARK KALE HEADERS (Zones 2, 4, 6, 7)
             ============================================================ */}
          {/* Column 2: CHANNEL */}
          <g>
            <rect
              x="160"
              y="72"
              width="120"
              height="445"
              rx="4"
              className="simple-col-bg"
            />
            <rect x="160" y="42" width="120" height="32" fill="#03363d" />
            <text
              x="220"
              y="62"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="700"
              letterSpacing="0.06em"
            >
              {t.simpleColChannel}
            </text>
          </g>

          {/* Column 4: GROUP TICKETS */}
          <g>
            <rect
              x="448"
              y="72"
              width="126"
              height="445"
              rx="4"
              className="simple-col-bg"
            />
            <rect x="448" y="42" width="126" height="32" fill="#03363d" />
            <text
              x="511"
              y="62"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="700"
              letterSpacing="0.05em"
            >
              {t.simpleColGroupTickets}
            </text>
          </g>

          {/* Column 6: AVAILABLE AGENTS */}
          <g>
            <rect
              x="738"
              y="72"
              width="124"
              height="445"
              rx="4"
              className="simple-col-bg"
            />
            <rect x="738" y="42" width="124" height="32" fill="#03363d" />
            <text
              x="800"
              y="62"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10.5"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {t.simpleColAvailableAgents}
            </text>
          </g>

          {/* Column 7: MOST CAPACITY */}
          <g>
            <rect
              x="882"
              y="72"
              width="118"
              height="445"
              rx="4"
              className="simple-col-bg"
            />
            <rect x="882" y="42" width="118" height="32" fill="#03363d" />
            <text
              x="941"
              y="62"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10.5"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {t.simpleColMostCapacity}
            </text>
          </g>

          {/* ============================================================
              ZONE 1 (STEP 1): END USER NODE & PILL
             ============================================================ */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setIsPlaying(false);
              setStep(1);
            }}
          >
            <circle
              cx="68"
              cy="255"
              r="32"
              className="simple-node-surface"
              filter="url(#cardDropShadow)"
              stroke={step === 1 ? '#038153' : 'transparent'}
              strokeWidth="2.5"
            />
            {/* User Silhouette in Dark Kale */}
            <circle cx="68" cy="245" r="7.5" fill="#03363d" />
            <path
              d="M 55 266 C 55 255, 81 255, 81 266 Z"
              fill="#03363d"
            />

            {/* END USER Grey Pill below */}
            <rect
              x="26"
              y="340"
              width="84"
              height="30"
              rx="5"
              fill="#c2c9cf"
            />
            <text
              x="68"
              y="359"
              textAnchor="middle"
              fill="#03363d"
              fontSize="10.5"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {t.simpleEndUser}
            </text>
          </g>

          {/* ============================================================
              ZONE 2 (STEP 2): CHANNEL ICONS (MESSAGING & EMAIL)
             ============================================================ */}
          {/* Top Circle: Messaging / Chat Bubbles */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setSelectedChannel('messaging');
              if (step < 2) setStep(2);
            }}
            transform="translate(220, 192)"
          >
            <circle
              r="32"
              fill={selectedChannel === 'messaging' ? '#f5e4b3' : '#d5dade'}
              stroke={
                selectedChannel === 'messaging' && step === 2
                  ? '#038153'
                  : 'transparent'
              }
              strokeWidth="2.5"
            />
            {/* Two Chat Bubbles Icon */}
            <rect
              x="-14"
              y="-12"
              width="19"
              height="13"
              rx="4"
              fill={selectedChannel === 'messaging' ? '#03363d' : '#ffffff'}
            />
            <polygon
              points="-9,1 -12,6 -4,1"
              fill={selectedChannel === 'messaging' ? '#03363d' : '#ffffff'}
            />
            <rect
              x="-2"
              y="-3"
              width="18"
              height="12"
              rx="4"
              fill={selectedChannel === 'messaging' ? '#038153' : '#ffffff'}
              opacity="0.92"
            />
            <polygon
              points="10,9 13,14 6,9"
              fill={selectedChannel === 'messaging' ? '#038153' : '#ffffff'}
            />
          </g>

          {/* Bottom Circle: Email Envelope */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setSelectedChannel('email');
              if (step < 2) setStep(2);
            }}
            transform="translate(220, 325)"
          >
            <circle
              r="32"
              fill={selectedChannel === 'email' ? '#f5e4b3' : '#d5dade'}
              stroke={
                selectedChannel === 'email' && step === 2
                  ? '#038153'
                  : 'transparent'
              }
              strokeWidth="2.5"
            />
            {/* Dark Kale Envelope Icon */}
            <rect
              x="-15"
              y="-10"
              width="30"
              height="20"
              rx="2"
              fill={selectedChannel === 'email' ? '#03363d' : '#ffffff'}
            />
            <polyline
              points="-15,-10 0,2 15,-10"
              fill="none"
              stroke={selectedChannel === 'email' ? '#f5e4b3' : '#d5dade'}
              strokeWidth="2.4"
            />
          </g>

          {/* ============================================================
              ZONE 3 (STEP 3): TRIGGER GEAR & 3 STACKED PILLS
             ============================================================ */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setIsPlaying(false);
              setStep(3);
            }}
          >
            <circle
              cx="370"
              cy="325"
              r="32"
              className="simple-node-surface"
              filter="url(#cardDropShadow)"
              stroke={step === 3 ? '#038153' : 'transparent'}
              strokeWidth="2.5"
            />
            {/* Gear Icon */}
            <g
              transform="translate(370, 325)"
              className={step === 3 || isPlaying ? 'gear-spinning' : ''}
            >
              <circle
                r="11"
                fill="none"
                stroke="#03363d"
                strokeWidth="5"
              />
              <circle
                r="14.5"
                fill="none"
                stroke="#03363d"
                strokeWidth="4"
                strokeDasharray="4.5 4.6"
              />
              <circle r="5" className="simple-node-surface" />
            </g>

            {/* 3 Stacked Trigger Pills below Gear */}
            <g opacity={step >= 3 ? 1 : 0.45}>
              {/* 1. AUTO ROUTING TAG */}
              <rect
                x="300"
                y="372"
                width="140"
                height="30"
                rx="5"
                fill="#03363d"
              />
              <text
                x="370"
                y="391"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9.5"
                fontWeight="700"
                letterSpacing="0.04em"
              >
                {t.simpleAutoRoutingTag}
              </text>

              {/* 2. ASSIGNED GROUP */}
              <rect
                x="300"
                y="410"
                width="140"
                height="30"
                rx="5"
                fill="#c2c9cf"
              />
              <text
                x="370"
                y="429"
                textAnchor="middle"
                fill="#03363d"
                fontSize="9.5"
                fontWeight="700"
                letterSpacing="0.04em"
              >
                {t.simpleAssignedGroup}
              </text>

              {/* 3. PRIORITY */}
              <rect
                x="300"
                y="448"
                width="140"
                height="30"
                rx="5"
                fill="#e5e9ec"
              />
              <text
                x="370"
                y="467"
                textAnchor="middle"
                fill="#03363d"
                fontSize="9.5"
                fontWeight="700"
                letterSpacing="0.04em"
              >
                {t.simplePriority}
              </text>
            </g>
          </g>

          {/* ============================================================
              ZONE 4 (STEP 4): GROUP TICKETS (URGENT, HIGH, LOW CARDS)
             ============================================================ */}
          {/* Card 1: URGENT */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setSelectedPriority('urgent');
              if (step < 4) setStep(4);
            }}
            opacity={selectedPriority === 'urgent' ? 1 : 0.45}
            filter="url(#cardDropShadow)"
          >
            <rect
              x="467"
              y="148"
              width="88"
              height="92"
              rx="6"
              fill="#ffffff"
            />
            <path
              d="M 467 154 Q 467 148 473 148 L 549 148 Q 555 148 555 154 L 555 174 L 467 174 Z"
              fill="#d63643"
            />
            <text
              x="477"
              y="165"
              fill="#ffffff"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {t.simpleUrgent}
            </text>
            <rect x="477" y="190" width="48" height="6" rx="3" fill="#e2e6ea" />
            <rect x="477" y="203" width="48" height="6" rx="3" fill="#e2e6ea" />
          </g>

          {/* Card 2: HIGH */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setSelectedPriority('high');
              if (step < 4) setStep(4);
            }}
            opacity={selectedPriority === 'high' ? 1 : 0.48}
            filter="url(#cardDropShadow)"
          >
            <rect
              x="467"
              y="273"
              width="88"
              height="92"
              rx="6"
              fill="#ffffff"
            />
            <path
              d="M 467 279 Q 467 273 473 273 L 549 273 Q 555 273 555 279 L 555 299 L 467 299 Z"
              fill="#f1dfc7"
            />
            <text
              x="477"
              y="290"
              fill="#7c5826"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {t.simpleHigh}
            </text>
            <rect x="477" y="315" width="48" height="6" rx="3" fill="#edf0f2" />
            <rect x="477" y="328" width="48" height="6" rx="3" fill="#edf0f2" />
          </g>

          {/* Card 3: LOW */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setSelectedPriority('low');
              if (step < 4) setStep(4);
            }}
            opacity={selectedPriority === 'low' ? 1 : 0.48}
            filter="url(#cardDropShadow)"
          >
            <rect
              x="467"
              y="398"
              width="88"
              height="92"
              rx="6"
              fill="#ffffff"
            />
            <path
              d="M 467 404 Q 467 398 473 398 L 549 398 Q 555 398 555 404 L 555 424 L 467 424 Z"
              fill="#bde2d2"
            />
            <text
              x="477"
              y="415"
              fill="#115e40"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {t.simpleLow}
            </text>
            <rect x="477" y="440" width="48" height="6" rx="3" fill="#edf0f2" />
            <rect x="477" y="453" width="48" height="6" rx="3" fill="#edf0f2" />
          </g>

          {/* ============================================================
              ZONE 5 (STEP 5): ASSIGNMENT CRITERIA GEAR & PILL
             ============================================================ */}
          <g
            className="svg-clickable-node"
            onClick={() => {
              setIsPlaying(false);
              setStep(5);
            }}
          >
            <circle
              cx="656"
              cy="162"
              r="32"
              className="simple-node-surface"
              filter="url(#cardDropShadow)"
              stroke={step === 5 ? '#038153' : 'transparent'}
              strokeWidth="2.5"
            />
            {/* Gear Icon */}
            <g
              transform="translate(656, 162)"
              className={step === 5 || isPlaying ? 'gear-spinning' : ''}
            >
              <circle
                r="11"
                fill="none"
                stroke="#03363d"
                strokeWidth="5"
              />
              <circle
                r="14.5"
                fill="none"
                stroke="#03363d"
                strokeWidth="4"
                strokeDasharray="4.5 4.6"
              />
              <circle r="5" className="simple-node-surface" />
            </g>

            {/* ASSIGNMENT CRITERIA Pill */}
            <rect
              x="581"
              y="214"
              width="150"
              height="30"
              rx="5"
              fill="#03363d"
            />
            <text
              x="656"
              y="233"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="9.5"
              fontWeight="700"
              letterSpacing="0.04em"
            >
              {t.simpleAssignmentCriteria}
            </text>
          </g>

          {/* ============================================================
              ZONE 6 (STEP 6): AVAILABLE AGENTS (3 PORTRAITS)
             ============================================================ */}
          {simpleAgents.map((ag) => {
            const isAvailable = ag.online;
            return (
              <g
                key={ag.id}
                transform={`translate(800, ${ag.y})`}
                className="svg-clickable-node"
                onClick={() => handleAgentClick(ag.id)}
                opacity={!isAvailable ? 0.36 : step >= 6 ? 1 : 0.75}
              >
                <g clipPath="url(#agentClip)">{renderAgentPortrait(ag.id)}</g>
                {/* Ring */}
                <circle
                  r="34.5"
                  fill="none"
                  stroke={isAvailable ? '#039e54' : '#cbd2d9'}
                  strokeWidth="3.2"
                />
                {/* Status Dot at bottom-right */}
                <circle
                  cx="23"
                  cy="23"
                  r="8.5"
                  fill={isAvailable ? '#039e54' : '#ffffff'}
                  stroke={isAvailable ? '#ffffff' : '#cbd2d9'}
                  strokeWidth="2.5"
                />
                {/* Spare capacity mini pill on hover/step 6+ */}
                {step >= 6 && (
                  <text
                    x="0"
                    y="50"
                    textAnchor="middle"
                    className="simple-agent-cap-text"
                    fontSize="9.5"
                    fontWeight="700"
                  >
                    {isAvailable
                      ? `${ag.name} • ${ag.sparePct}% ${t.freePct}`
                      : `${ag.name} • Offline`}
                  </text>
                )}
              </g>
            );
          })}

          {/* ============================================================
              ZONE 7 (STEP 7): MOST CAPACITY (WINNER PORTRAIT)
             ============================================================ */}
          {simpleAgents.map((ag) => {
            if (!ag.online) return null;
            const isWinner = winnerAgent && winnerAgent.id === ag.id;
            return (
              <g
                key={`most-${ag.id}`}
                transform={`translate(941, ${ag.y})`}
                className="svg-clickable-node"
                onClick={() => handleAgentClick(ag.id)}
                opacity={step < 7 ? 0.18 : isWinner ? 1 : 0.28}
              >
                {/* Pulsing Winner Halo at Step 7 */}
                {isWinner && step >= 7 && (
                  <circle
                    r="41"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeDasharray="5 4"
                  />
                )}
                <g clipPath="url(#agentClip)">{renderAgentPortrait(ag.id)}</g>
                <circle
                  r="34.5"
                  fill="none"
                  stroke="#039e54"
                  strokeWidth={isWinner ? '3.8' : '3'}
                />
                <circle
                  cx="23"
                  cy="23"
                  r="8.5"
                  fill="#039e54"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                {isWinner && step >= 7 && (
                  <text
                    x="0"
                    y="50"
                    textAnchor="middle"
                    fill="#039e54"
                    fontSize="10"
                    fontWeight="800"
                  >
                    ★ {ag.name} ({ag.sparePct}%)
                  </text>
                )}
              </g>
            );
          })}

          {/* ============================================================
              CONNECTOR LINES, PORTS (o) & ARROWS (1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7)
             ============================================================ */}
          {/* 1 -> 2 Connector */}
          <g opacity={step >= 2 ? 1 : 0.3}>
            <path
              d={pathStep1To2}
              fill="none"
              stroke="#03363d"
              className="simple-connector-line"
              strokeWidth="2.2"
            />
            <polyline
              points={`176,${channelY - 5} 183,${channelY} 176,${channelY + 5}`}
              fill="none"
              stroke="#03363d"
              className="simple-connector-line"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="103"
              cy="255"
              r="3.5"
              fill="#ffffff"
              stroke="#03363d"
              strokeWidth="2.2"
            />
          </g>

          {/* 2 -> 3 Connector */}
          <g opacity={step >= 3 ? 1 : 0.3}>
            <path
              d={pathStep2To3}
              fill="none"
              stroke="#03363d"
              className="simple-connector-line"
              strokeWidth="2.2"
            />
            <circle
              cx="258"
              cy={channelY}
              r="3.5"
              fill="#ffffff"
              stroke="#03363d"
              strokeWidth="2.2"
            />
          </g>

          {/* 3 -> 4 Connector */}
          <g opacity={step >= 4 ? 1 : 0.3}>
            <path
              d={pathStep3To4}
              fill="none"
              stroke="#03363d"
              className="simple-connector-line"
              strokeWidth="2.2"
            />
            <polyline
              points={`457,${priorityHeaderY - 5} 464,${priorityHeaderY} 457,${
                priorityHeaderY + 5
              }`}
              fill="none"
              stroke="#03363d"
              className="simple-connector-line"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* 4 -> 5 Connector */}
          <g opacity={step >= 5 ? 1 : 0.3}>
            <path
              d={pathStep4To5}
              fill="none"
              stroke="#03363d"
              className="simple-connector-line"
              strokeWidth="2.2"
            />
            <circle
              cx="555"
              cy={priorityHeaderY}
              r="3.5"
              fill="#ffffff"
              stroke="#03363d"
              strokeWidth="2.2"
            />
          </g>

          {/* 5 -> 6 Branching Connectors to each Available Agent */}
          <g opacity={step >= 6 ? 1 : 0.28}>
            {availableAgents.map((ag) => {
              const branchPath = `M 690 162 L 716 162 Q 724 162 724 172 L 724 ${
                ag.y - 8
              } Q 724 ${ag.y} 732 ${ag.y} L 760 ${ag.y}`;
              return (
                <g key={`branch-${ag.id}`}>
                  <path
                    d={branchPath}
                    fill="none"
                    stroke="#03363d"
                    className="simple-connector-line"
                    strokeWidth="2.2"
                  />
                  <polyline
                    points={`754,${ag.y - 5} 761,${ag.y} 754,${ag.y + 5}`}
                    fill="none"
                    stroke="#03363d"
                    className="simple-connector-line"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* 6 -> 7 Winner Connector (From Available Agent with Most Capacity to Column 7) */}
          {winnerAgent && (
            <g opacity={step >= 7 ? 1 : 0.25}>
              <line
                x1="839"
                y1={winnerAgent.y}
                x2="901"
                y2={winnerAgent.y}
                stroke="#03363d"
                className="simple-connector-line"
                strokeWidth="2.4"
              />
              <polyline
                points={`895,${winnerAgent.y - 5} 902,${winnerAgent.y} 895,${
                  winnerAgent.y + 5
                }`}
                fill="none"
                stroke="#03363d"
                className="simple-connector-line"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="839"
                cy={winnerAgent.y}
                r="3.5"
                fill="#ffffff"
                stroke="#03363d"
                strokeWidth="2.2"
              />
              {/* Animated Traveling Ticket Orb on Final Assignment */}
              {step === 7 && (
                <circle r="5.5" fill="#10b981" filter="url(#orbGlow)">
                  <animateMotion
                    dur="1.2s"
                    repeatCount="indefinite"
                    path={`M 839 ${winnerAgent.y} L 901 ${winnerAgent.y}`}
                  />
                </circle>
              )}
            </g>
          )}

          {/* ============================================================
              BOTTOM 1 -> 7 NUMBERED TIMELINE BAR (Exact screenshot match)
             ============================================================ */}
          {[
            { num: 1, x: 68 },
            { num: 2, x: 220 },
            { num: 3, x: 370 },
            { num: 4, x: 511 },
            { num: 5, x: 656 },
            { num: 6, x: 800 },
            { num: 7, x: 941 },
          ].map((item, idx, arr) => {
            const isCurrent = step === item.num;
            const isDone = step >= item.num;
            const nextItem = arr[idx + 1];

            return (
              <g key={item.num}>
                {/* Numbered Circle */}
                <g
                  className="svg-clickable-node"
                  onClick={() => {
                    setIsPlaying(false);
                    setStep(item.num);
                  }}
                >
                  <circle
                    cx={item.x}
                    cy="565"
                    r="21"
                    fill={isCurrent ? '#038153' : '#03363d'}
                    opacity={isDone ? 1 : 0.42}
                    stroke={isCurrent ? '#10b981' : 'transparent'}
                    strokeWidth="3"
                  />
                  <text
                    x={item.x}
                    y="570"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13.5"
                    fontWeight="700"
                  >
                    {item.num}
                  </text>
                </g>

                {/* Dotted Arrow o-------> to Next Step */}
                {nextItem && (
                  <g opacity={step > item.num ? 1 : 0.4}>
                    <circle
                      cx={item.x + 36}
                      cy="565"
                      r="3"
                      fill="#ffffff"
                      stroke="#03363d"
                      className="simple-connector-line"
                      strokeWidth="2"
                    />
                    <line
                      x1={item.x + 41}
                      y1="565"
                      x2={nextItem.x - 36}
                      y2="565"
                      stroke="#03363d"
                      className="simple-connector-line"
                      strokeWidth="2"
                      strokeDasharray="3.5 3.5"
                    />
                    <polyline
                      points={`${nextItem.x - 41},560 ${nextItem.x - 35},565 ${
                        nextItem.x - 41
                      },570`}
                      fill="none"
                      stroke="#03363d"
                      className="simple-connector-line"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Interactive Tip & Quick Switch to Extended Mode */}
      <div className="simple-footer-bar">
        <span className="simple-tip-text">
          <Sparkles size={15} color="#038153" />
          {t.simpleInteractiveHint}
        </span>

        <button
          type="button"
          className="ctrl-btn"
          onClick={onSwitchToExtended}
        >
          <Sliders size={14} />
          {t.simpleSwitchToExtended}
        </button>
      </div>
    </main>
  );
}
