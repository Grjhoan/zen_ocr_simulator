import { CHANNELS, UNIFIED_STATUSES, ZENDESK_PLANS } from '../data/scenarios';

/**
 * Evaluates a ticket through Zendesk Omnichannel Routing rules and returns
 * the complete visual trace for each step and each agent in English or Spanish.
 */
export function evaluateOmnichannelRouting({
  ticket,
  agents,
  config,
  declinedAgentIds = [],
  skillsTimedOut = false,
  lang = 'en',
}) {
  const planSpec = ZENDESK_PLANS[config.plan] || ZENDESK_PLANS.Enterprise;
  const channelSpec = CHANNELS[ticket.channel] || CHANNELS.email;
  const isEs = lang === 'es';

  // Check if Voicemail (bypasses OCR completely)
  if (ticket.channel === 'voicemail' || channelSpec.bypassesOCR) {
    return {
      routable: false,
      bypassReason: 'voicemail',
      bypassTitle: isEs
        ? 'Omite el Enrutamiento Omnicanal'
        : 'Bypasses Omnichannel Routing',
      bypassDetail: isEs
        ? 'Las llamadas fuera del horario comercial van al Buzón de Voz ("Voicemail from...") y no se enrutan por OCR.'
        : 'Calls outside business hours go to Voicemail ("Voicemail from...") and are not routed by OCR.',
      queueType: 'none',
      queueName: isEs ? 'Sin enrutar (Vista Buzón)' : 'Unrouted (Voicemail View)',
      activeGroup: ticket.assignedGroup,
      usedFallbackGroup: false,
      agentEvaluations: agents.map((a) => ({
        agentId: a.id,
        inTargetGroup: false,
        statusEligible: false,
        skillEligible: false,
        capacityEligible: false,
        sparePercent: 0,
        spareCount: 0,
        eliminatedAtStep: 4,
        reasonBadge: isEs ? 'Buzón no enrutado' : 'Voicemail Not Routed',
        isWinner: false,
      })),
      winnerAgent: null,
    };
  }

  // Determine Queue Matching (Step 4)
  const useCustomQueue =
    planSpec.supportsCustomQueues &&
    config.enableCustomQueues &&
    ticket.matchesCustomQueue;

  // Email in Standard Queue requires auto-routing tag
  if (
    !useCustomQueue &&
    ticket.channel === 'email' &&
    !ticket.autoRoutingTag
  ) {
    return {
      routable: false,
      bypassReason: 'missing_tag',
      bypassTitle: isEs
        ? 'Retenido — Falta Etiqueta de Enrutamiento'
        : 'Held — Missing Auto-Routing Tag',
      bypassDetail: isEs
        ? 'En la Cola Estándar, los tickets de Correo requieren la etiqueta de enrutamiento (o una Cola Personalizada) para entrar a OCR.'
        : 'In the Standard Queue, Email tickets require an auto-routing tag (or a Custom Queue) to enter OCR.',
      queueType: 'blocked',
      queueName: isEs ? 'Retenido antes de Cola Estándar' : 'Blocked before Standard Queue',
      activeGroup: ticket.assignedGroup,
      usedFallbackGroup: false,
      agentEvaluations: agents.map((a) => ({
        agentId: a.id,
        inTargetGroup: a.groups.includes(ticket.assignedGroup),
        statusEligible: false,
        skillEligible: false,
        capacityEligible: false,
        sparePercent: 0,
        spareCount: 0,
        eliminatedAtStep: 4,
        reasonBadge: isEs ? 'Esperando #auto_route' : 'Waiting for #auto_route tag',
        isWinner: false,
      })),
      winnerAgent: null,
    };
  }

  const queueType = useCustomQueue ? 'custom' : 'standard';
  const queueName = useCustomQueue
    ? ticket.customQueueName || (isEs ? 'Cola Personalizada' : 'Custom Priority Queue')
    : isEs
    ? 'Cola Estándar Omnicanal'
    : 'Standard Omnichannel Queue';

  const primaryGroup = useCustomQueue
    ? ticket.primaryGroup || ticket.assignedGroup
    : ticket.assignedGroup;
  const fallbackGroup = useCustomQueue ? ticket.fallbackGroup : null;

  // Helper to evaluate a specific target group (Primary or Fallback)
  const evaluateForGroup = (targetGroup, isFallback = false) => {
    const evaluations = agents.map((agent) => {
      const inGroup = agent.groups.includes(targetGroup);
      const wasDeclined = declinedAgentIds.includes(agent.id);

      // Step 6: Unified Agent Status check
      const statusEligible = channelSpec.eligibleStatuses.includes(agent.status);

      // Step 7: Skills check
      const effectiveSkillRequired =
        planSpec.supportsSkills &&
        config.enableSkills &&
        ticket.requiredSkill &&
        !(ticket.skillIsOptional && skillsTimedOut)
          ? ticket.requiredSkill
          : null;

      const skillEligible = effectiveSkillRequired
        ? agent.skills.includes(effectiveSkillRequired)
        : true;

      // Step 8: Channel Capacity check
      const capObj = agent.capacity[ticket.channel] || { used: 0, max: 1 };
      const spareCount = Math.max(0, capObj.max - capObj.used);
      const sparePercent =
        capObj.max > 0 ? Math.round((spareCount / capObj.max) * 100) : 0;
      const capacityEligible = spareCount > 0;

      const idleSeconds = agent.lastAssignedSecondsAgo?.[ticket.channel] || 0;

      let eliminatedAtStep = null;
      let reasonBadge = isEs ? 'Elegible' : 'Eligible';

      if (wasDeclined) {
        eliminatedAtStep = 5;
        reasonBadge = isEs ? 'Sin respuesta / Rechazado (30s)' : 'Timed Out / Declined (30s)';
      } else if (!inGroup) {
        eliminatedAtStep = 5;
        reasonBadge = isEs ? `No está en ${targetGroup}` : `Not in ${targetGroup}`;
      } else if (!statusEligible) {
        eliminatedAtStep = 6;
        const stObj = UNIFIED_STATUSES[agent.status];
        const stLabel = stObj?.label?.[lang] || agent.status;
        reasonBadge =
          agent.status === 'away'
            ? isEs
              ? 'Ausente (Solo Correo)'
              : 'Away (Email Only)'
            : isEs
            ? `${stLabel} (No disponible)`
            : `${stLabel} (Unavailable)`;
      } else if (!skillEligible) {
        eliminatedAtStep = 7;
        reasonBadge = isEs
          ? `Sin habilidad: ${effectiveSkillRequired}`
          : `No ${effectiveSkillRequired} Skill`;
      } else if (!capacityEligible) {
        eliminatedAtStep = 8;
        reasonBadge = isEs
          ? `Capacidad Llena (${capObj.used}/${capObj.max})`
          : `Full Capacity (${capObj.used}/${capObj.max})`;
      }

      return {
        agent,
        agentId: agent.id,
        inTargetGroup: inGroup,
        wasDeclined,
        statusEligible: inGroup && !wasDeclined && statusEligible,
        skillEligible:
          inGroup && !wasDeclined && statusEligible && skillEligible,
        capacityEligible:
          inGroup &&
          !wasDeclined &&
          statusEligible &&
          skillEligible &&
          capacityEligible,
        spareCount,
        sparePercent,
        idleSeconds,
        usedCount: capObj.used,
        maxCount: capObj.max,
        eliminatedAtStep,
        reasonBadge,
        isFallbackGroupMember: isFallback,
      };
    });

    // Determine winner among fully eligible agents
    const fullyEligible = evaluations.filter((e) => e.capacityEligible);

    fullyEligible.sort((a, b) => {
      if (config.assignmentMethod === 'round_robin') {
        return b.idleSeconds - a.idleSeconds;
      }
      if (b.sparePercent !== a.sparePercent) {
        return b.sparePercent - a.sparePercent;
      }
      return b.idleSeconds - a.idleSeconds;
    });

    const winner = fullyEligible[0] || null;

    const finalEvaluations = evaluations.map((ev) => {
      if (winner && ev.agentId === winner.agentId) {
        return {
          ...ev,
          isWinner: true,
          reasonBadge:
            config.assignmentMethod === 'round_robin'
              ? isEs
                ? `Asignado • Mayor espera (${Math.floor(ev.idleSeconds / 60)}m)`
                : `Winner • Longest Idle (${Math.floor(ev.idleSeconds / 60)}m)`
              : isEs
              ? `Asignado • ${ev.sparePercent}% Capacidad Libre`
              : `Winner • ${ev.sparePercent}% Spare Capacity`,
        };
      }
      if (ev.capacityEligible && winner) {
        return {
          ...ev,
          isWinner: false,
          eliminatedAtStep: 8,
          reasonBadge:
            config.assignmentMethod === 'round_robin'
              ? isEs
                ? `En espera (${Math.floor(ev.idleSeconds / 60)}m)`
                : `Runner-up (${Math.floor(ev.idleSeconds / 60)}m idle)`
              : isEs
              ? `Menor Capacidad (${ev.sparePercent}% vs ${winner.sparePercent}%)`
              : `Lower Spare (${ev.sparePercent}% vs ${winner.sparePercent}%)`,
        };
      }
      return {
        ...ev,
        isWinner: false,
      };
    });

    return {
      evaluations: finalEvaluations,
      winnerAgent: winner ? winner.agent : null,
    };
  };

  // Evaluate Primary Group first
  let result = evaluateForGroup(primaryGroup, false);
  let activeGroup = primaryGroup;
  let usedFallbackGroup = false;

  // When using custom queues, if no agents in primary group are available,
  // OCR looks for available agents in secondary ("fallback") groups.
  if (!result.winnerAgent && useCustomQueue && fallbackGroup) {
    const fallbackResult = evaluateForGroup(fallbackGroup, true);
    if (fallbackResult.winnerAgent) {
      result = fallbackResult;
      activeGroup = fallbackGroup;
      usedFallbackGroup = true;
    }
  }

  return {
    routable: true,
    bypassReason: null,
    queueType,
    queueName,
    primaryGroup,
    fallbackGroup,
    activeGroup,
    usedFallbackGroup,
    agentEvaluations: result.evaluations,
    winnerAgent: result.winnerAgent,
    effectiveSkillRequired:
      planSpec.supportsSkills &&
      config.enableSkills &&
      ticket.requiredSkill &&
      !(ticket.skillIsOptional && skillsTimedOut)
        ? ticket.requiredSkill
        : null,
  };
}

/**
 * Orders a list of queued tickets according to the active Zendesk Plan & Queue Order rule
 */
export function sortQueueTickets(tickets, config) {
  const priorityWeight = {
    Urgent: 4,
    High: 3,
    Normal: 2,
    Low: 1,
  };

  return [...tickets].sort((a, b) => {
    const aCustom = config.enableCustomQueues && a.matchesCustomQueue ? 1 : 0;
    const bCustom = config.enableCustomQueues && b.matchesCustomQueue ? 1 : 0;
    if (aCustom !== bCustom) {
      return bCustom - aCustom;
    }

    if (config.queueOrder === 'priority') {
      const pDiff =
        (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return (a.createdAtOrder || 0) - (b.createdAtOrder || 0);
    }

    if (config.queueOrder === 'sla') {
      return (a.slaMinutes || 60) - (b.slaMinutes || 60);
    }

    return (a.createdAtOrder || 0) - (b.createdAtOrder || 0);
  });
}
