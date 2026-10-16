import React from 'react';
import { UNIFIED_STATUSES } from '../data/scenarios';

/**
 * Interactive SVG Visual Diagram for Extended Mode:
 * Shows the live animated flow from:
 * [1. End User] -> [2. Channel Envelope] -> [3. Trigger Gear + Tags] -> [4. Queue Stack] -> [5-8. 4-Agent Branching Network]
 * with animated dashed SVG paths, glowing traveling ticket particles, and live pruning at Steps 6, 7, and 8.
 */
export default function VisualFlowRibbon({
  activeTicket,
  agents,
  evaluation,
  currentStep,
  onSelectStep,
  onCycleAgentStatus,
  lang = 'en',
}) {
  const isEs = lang === 'es';

  const agentCoords = [
    { x: 750, y: 58 },
    { x: 895, y: 58 },
    { x: 750, y: 158 },
    { x: 895, y: 158 },
  ];

  const isRoutable = evaluation.routable;

  const getBranchStyle = (agent) => {
    const ev = evaluation.agentEvaluations.find((e) => e.agentId === agent.id);
    if (!ev || !isRoutable || currentStep < 5) {
      return {
        stroke: 'rgba(148, 197, 209, 0.3)',
        active: false,
        winner: false,
        dimmed: currentStep >= 5,
        badgeText: '',
      };
    }

    if (currentStep === 5) {
      const ok = ev.inTargetGroup && !ev.wasDeclined;
      return {
        stroke: ok ? '#0284c7' : 'rgba(244, 63, 94, 0.35)',
        active: ok,
        winner: false,
        dimmed: !ok,
        badgeText: ok ? (isEs ? 'En Grupo' : 'In Group') : isEs ? 'Fuera' : 'Out',
      };
    }

    if (currentStep === 6) {
      const ok = ev.statusEligible;
      const stLabel = UNIFIED_STATUSES[agent.status]?.label?.[lang] || agent.status;
      return {
        stroke: ok ? '#10b981' : 'rgba(244, 63, 94, 0.35)',
        active: ok,
        winner: false,
        dimmed: !ok,
        badgeText: ok ? stLabel : isEs ? 'Estado ✕' : 'Status ✕',
      };
    }

    if (currentStep === 7) {
      const ok = ev.skillEligible;
      return {
        stroke: ok ? '#0284c7' : 'rgba(244, 63, 94, 0.35)',
        active: ok,
        winner: false,
        dimmed: !ok,
        badgeText: ok
          ? isEs
            ? 'Habilidad ✓'
            : 'Skill ✓'
          : isEs
          ? 'Sin Hab.'
          : 'No Skill',
      };
    }

    return {
      stroke: ev.isWinner
        ? '#10b981'
        : ev.capacityEligible
        ? 'rgba(56, 189, 248, 0.45)'
        : 'rgba(148, 197, 209, 0.22)',
      active: ev.isWinner,
      winner: ev.isWinner,
      dimmed: !ev.isWinner,
      badgeText: ev.isWinner
        ? `★ ${ev.sparePercent}% ${isEs ? 'Libre' : 'Free'}`
        : `${ev.sparePercent}% ${isEs ? 'Libre' : 'Free'}`,
    };
  };

  const buildAgentPath = (idx) => {
    const target = agentCoords[idx];
    const startX = 615;
    const startY = 108;
    const midX = 675;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${target.y}, ${target.x} ${target.y}`;
  };

  return (
    <div
      className="visual-ribbon-container"
      aria-label="Animated Omnichannel Routing Diagram"
    >
      <svg
        viewBox="0 0 980 216"
        className="ocr-schematic-svg"
        role="img"
        aria-label="Visual flow from Customer to Channel, Trigger Gear, Queue, and Agent Pool"
      >
        <defs>
          <linearGradient id="activeBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="winnerBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* SEGMENT 1->2 */}
        <path
          d="M 75 62 L 130 62 L 130 108 L 195 108"
          fill="none"
          stroke={currentStep >= 2 ? 'url(#activeBeamGrad)' : 'rgba(148,197,209,0.32)'}
          strokeWidth={currentStep >= 2 ? 3 : 2}
          className={currentStep === 2 ? 'svg-route-beam' : ''}
        />

        {/* SEGMENT 2->3 */}
        <path
          d="M 235 108 L 350 108"
          fill="none"
          stroke={currentStep >= 3 ? 'url(#activeBeamGrad)' : 'rgba(148,197,209,0.32)'}
          strokeWidth={currentStep >= 3 ? 3 : 2}
          className={currentStep === 3 ? 'svg-route-beam' : ''}
        />

        {/* SEGMENT 3->4 */}
        <path
          d="M 385 108 L 455 108 L 455 68 L 515 68 M 455 108 L 515 108"
          fill="none"
          stroke={
            !isRoutable && currentStep >= 4
              ? '#f43f5e'
              : currentStep >= 4
              ? 'url(#activeBeamGrad)'
              : 'rgba(148,197,209,0.32)'
          }
          strokeWidth={currentStep >= 4 ? 3 : 2}
          className={currentStep === 4 ? 'svg-route-beam' : ''}
        />

        {/* SEGMENT 4->AGENTS */}
        {agents.map((agent, idx) => {
          const bStyle = getBranchStyle(agent);
          const pathD = buildAgentPath(idx);
          return (
            <g key={agent.id}>
              <path
                d={pathD}
                fill="none"
                stroke={bStyle.winner ? 'url(#winnerBeamGrad)' : bStyle.stroke}
                strokeWidth={bStyle.winner ? 3.8 : bStyle.active ? 2.6 : 1.6}
                className={bStyle.active ? 'svg-route-beam' : ''}
              />
              {bStyle.winner && currentStep >= 8 && (
                <circle r="6" fill="#10b981" filter="url(#glowFilter)">
                  <animateMotion dur="1.4s" repeatCount="indefinite" path={pathD} />
                </circle>
              )}
            </g>
          );
        })}

        {/* NODE 1: END USER */}
        <g
          className="svg-clickable-node"
          onClick={() => onSelectStep(1)}
          transform="translate(75, 62)"
        >
          <circle
            r="24"
            fill="#042f36"
            stroke={currentStep === 1 ? '#10b981' : '#0284c7'}
            strokeWidth={currentStep === 1 ? 3 : 2}
          />
          <circle cx="0" cy="-5" r="6" fill="#f1f7f9" />
          <path d="M -10 11 C -10 3, 10 3, 10 11 Z" fill="#f1f7f9" />
          <rect x="-42" y="34" width="84" height="20" rx="5" fill="#cbd5e1" />
          <text
            x="0"
            y="47"
            textAnchor="middle"
            fill="#0f172a"
            fontSize="8"
            fontWeight="800"
          >
            {isEs ? 'USUARIO FINAL' : 'END USER'}
          </text>
          <text
            x="0"
            y="68"
            textAnchor="middle"
            className="ribbon-svg-label"
            fontSize="8.5"
            fontWeight="600"
          >
            {activeTicket.customerTier}
          </text>
        </g>

        {/* NODE 2: CHANNEL ICON */}
        <g
          className="svg-clickable-node"
          onClick={() => onSelectStep(2)}
          transform="translate(215, 108)"
        >
          <rect
            x="-26"
            y="-24"
            width="52"
            height="48"
            rx="11"
            fill="#042f36"
            stroke={currentStep === 2 ? '#f59e0b' : '#0284c7'}
            strokeWidth={currentStep === 2 ? 3 : 2}
          />
          <rect
            x="-14"
            y="-10"
            width="28"
            height="20"
            rx="3"
            fill="#03363d"
            stroke="#34d399"
            strokeWidth="1.6"
          />
          <path d="M -13 -9 L 0 2 L 13 -9" fill="none" stroke="#fbbf24" strokeWidth="2" />
          <text
            x="0"
            y="39"
            textAnchor="middle"
            className="ribbon-svg-label"
            fontSize="9"
            fontWeight="700"
          >
            {activeTicket.viaSubtype}
          </text>
        </g>

        {/* NODE 3: TRIGGER GEAR & TAG STACK */}
        <g
          className="svg-clickable-node"
          onClick={() => onSelectStep(3)}
          transform="translate(366, 76)"
        >
          <circle
            r="23"
            fill="#042f36"
            stroke={currentStep === 3 ? '#10b981' : '#0d9488'}
            strokeWidth={currentStep === 3 ? 3 : 2}
          />
          <circle
            r="9"
            fill="none"
            stroke="#34d399"
            strokeWidth="4"
            strokeDasharray="4 3"
          />
          <circle r="4" fill="#f1f7f9" />

          <g transform="translate(0, 34)">
            <rect
              x="-58"
              y="0"
              width="116"
              height="19"
              rx="4"
              fill="#042f36"
              stroke="#0d9488"
              strokeWidth="1"
            />
            <text
              x="0"
              y="13"
              textAnchor="middle"
              fill="#f0fdfa"
              fontSize="7.4"
              fontWeight="800"
            >
              {activeTicket.autoRoutingTag
                ? isEs
                  ? 'ETIQUETA AUTO_ROUTE'
                  : 'AUTO ROUTING TAG'
                : isEs
                ? 'SIN ETIQUETA'
                : 'NO ROUTING TAG'}
            </text>

            <rect x="-58" y="23" width="116" height="19" rx="4" fill="#cbd5e1" />
            <text
              x="0"
              y="36"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="7.4"
              fontWeight="800"
            >
              {isEs ? 'GRUPO' : 'GROUP'}: {activeTicket.assignedGroup.toUpperCase()}
            </text>

            <rect x="-58" y="46" width="116" height="19" rx="4" fill="#e2e8f0" />
            <text
              x="0"
              y="59"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="7.4"
              fontWeight="800"
            >
              {isEs ? 'PRIORIDAD' : 'PRIORITY'}: {activeTicket.priority.toUpperCase()}
            </text>

            <rect
              x="-58"
              y="69"
              width="116"
              height="19"
              rx="4"
              fill="#1e3a8a"
              stroke="#3b82f6"
              strokeWidth="1"
            />
            <text
              x="0"
              y="82"
              textAnchor="middle"
              fill="#dbeafe"
              fontSize="7.4"
              fontWeight="800"
            >
              {isEs ? 'HABILIDAD' : 'SKILL'}:{' '}
              {activeTicket.requiredSkill
                ? activeTicket.requiredSkill.toUpperCase()
                : isEs
                ? 'CUALQUIERA'
                : 'ANY'}
            </text>
          </g>
        </g>

        {/* NODE 4: OMNICHANNEL QUEUE STACK */}
        <g
          className="svg-clickable-node"
          onClick={() => onSelectStep(4)}
          transform="translate(565, 108)"
        >
          <rect
            x="-52"
            y="-64"
            width="104"
            height="128"
            rx="12"
            fill="#042f36"
            stroke={
              !isRoutable && currentStep >= 4
                ? '#f43f5e'
                : currentStep === 4
                ? '#10b981'
                : 'rgba(148,197,209,0.35)'
            }
            strokeWidth="2"
          />
          <text
            x="0"
            y="-44"
            textAnchor="middle"
            fill="#9fb8c0"
            fontSize="7.6"
            fontWeight="800"
          >
            {evaluation.queueType === 'custom'
              ? isEs
                ? 'COLA PERSONALIZADA'
                : 'CUSTOM QUEUE'
              : isEs
              ? 'COLA ESTÁNDAR'
              : 'STANDARD QUEUE'}
          </text>

          <rect
            x="-40"
            y="-32"
            width="80"
            height="22"
            rx="5"
            fill={isRoutable ? '#fde68a' : '#fda4af'}
          />
          <text
            x="0"
            y="-18"
            textAnchor="middle"
            fill="#78350f"
            fontSize="8"
            fontWeight="800"
          >
            {isRoutable
              ? `1. ${activeTicket.priority.toUpperCase()}`
              : isEs
              ? 'RETENIDO'
              : 'HELD / BYPASSED'}
          </text>

          <rect
            x="-40"
            y="-3"
            width="80"
            height="18"
            rx="4"
            fill="rgba(56, 189, 248, 0.22)"
          />
          <text
            x="0"
            y="9"
            textAnchor="middle"
            fill="#bae6fd"
            fontSize="7.5"
            fontWeight="700"
          >
            2. HIGH • 6m SLA
          </text>

          <rect
            x="-40"
            y="21"
            width="80"
            height="18"
            rx="4"
            fill="rgba(16, 185, 129, 0.22)"
          />
          <text
            x="0"
            y="33"
            textAnchor="middle"
            fill="#a7f3d0"
            fontSize="7.5"
            fontWeight="700"
          >
            3. LOW • 28m SLA
          </text>

          <text
            x="0"
            y="54"
            textAnchor="middle"
            fill="#34d399"
            fontSize="7.3"
            fontWeight="700"
          >
            {isEs ? 'Frente Enruta →' : 'Front Routes First →'}
          </text>
        </g>

        {/* NODES 5-8: 2x2 AGENT POOL NODES */}
        {agents.map((agent, idx) => {
          const coord = agentCoords[idx];
          const bStyle = getBranchStyle(agent);
          const stSpec = UNIFIED_STATUSES[agent.status] || UNIFIED_STATUSES.offline;

          return (
            <g
              key={agent.id}
              transform={`translate(${coord.x}, ${coord.y})`}
              className="svg-clickable-node"
              onClick={() => onCycleAgentStatus(agent.id)}
              opacity={bStyle.dimmed ? 0.35 : 1}
            >
              {bStyle.winner && (
                <circle
                  r="33"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="5 3"
                />
              )}

              <circle
                r="26"
                fill="#042f36"
                stroke={bStyle.winner ? '#10b981' : stSpec.dotColor}
                strokeWidth={bStyle.winner ? 3.5 : 2.5}
              />

              <text
                x="0"
                y="4"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="800"
              >
                {agent.avatar}
              </text>

              <circle
                cx="18"
                cy="-18"
                r="6"
                fill={stSpec.dotColor}
                stroke="#042f36"
                strokeWidth="2"
              />

              <text
                x="0"
                y="38"
                textAnchor="middle"
                className="ribbon-svg-label"
                fontSize="8.5"
                fontWeight="700"
              >
                {agent.name.split(' ')[0]}{' '}
                {agent.skills.includes('German') ? '🇩🇪' : ''}
              </text>

              {bStyle.badgeText && (
                <g transform="translate(0, -39)">
                  <rect
                    x="-36"
                    y="-9"
                    width="72"
                    height="15"
                    rx="7"
                    fill={bStyle.winner ? '#059669' : '#042f36'}
                    stroke={bStyle.winner ? '#34d399' : 'rgba(148,197,209,0.4)'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="1.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="7.2"
                    fontWeight="800"
                  >
                    {bStyle.badgeText}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
