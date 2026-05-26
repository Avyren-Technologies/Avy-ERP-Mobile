/** Labels appended to work order observations by close/reopen APIs. */
const NOTE_LINE_PATTERN = /^\[(Closed|Closure|Reopened|Reopen)\]\s*/i;

export type WorkOrderDescriptionSource = {
    description?: string | null;
    observations?: string | null;
    status?: string | null;
    closedAt?: string | Date | null;
    workRequests?: Array<{ description?: string | null }> | null;
};

export function stripLifecycleNotes(text?: string | null): string {
    if (!text?.trim()) return '';
    return text
        .split('\n')
        .filter((line) => !NOTE_LINE_PATTERN.test(line.trim()))
        .join('\n')
        .trim();
}

function lifecycleNoteBody(line: string): string {
    return line.replace(NOTE_LINE_PATTERN, '').trim();
}

function removeDuplicateClosureBodies(text: string, observations?: string | null): string {
    if (!text.trim() || !observations?.trim()) return text.trim();

    const bodies = getWorkOrderLifecycleNotes(observations)
        .map(lifecycleNoteBody)
        .filter(Boolean);

    let result = text.trim();
    for (const body of bodies) {
        if (result === body) return '';
        const paragraphs = result.split(/\n\n+/).filter((p) => p.trim() !== body);
        result = paragraphs.join('\n\n').trim();
    }
    return result;
}

function getLegacyUntaggedClosure(wo: WorkOrderDescriptionSource): string | null {
    const obs = wo.observations?.trim();
    if (!obs) return null;
    if (wo.description?.trim() || wo.workRequests?.[0]?.description?.trim()) return null;
    if (getWorkOrderLifecycleNotes(obs).length > 0) return null;
    if (wo.status === 'CLOSED' || wo.closedAt) return obs;
    return null;
}

export function getWorkOrderBaseDescription(wo: WorkOrderDescriptionSource): string {
    const woDesc = wo.description?.trim();
    if (woDesc && !NOTE_LINE_PATTERN.test(woDesc)) return woDesc;

    const wrDesc = wo.workRequests?.[0]?.description?.trim();
    if (wrDesc) return wrDesc;

    const legacyClosure = getLegacyUntaggedClosure(wo);
    let fromObservations = stripLifecycleNotes(wo.observations);
    fromObservations = removeDuplicateClosureBodies(fromObservations, wo.observations);

    if (legacyClosure) {
        if (!fromObservations || fromObservations === legacyClosure) {
            fromObservations = '';
        }
    }

    return fromObservations;
}

export function getWorkOrderLifecycleNotes(text?: string | null): string[] {
    if (!text?.trim()) return [];
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => NOTE_LINE_PATTERN.test(line));
}

export function getWorkOrderClosureHistory(wo: WorkOrderDescriptionSource): string[] {
    const tagged = getWorkOrderLifecycleNotes(wo.observations);
    const legacy = getLegacyUntaggedClosure(wo);
    if (legacy && !tagged.some((line) => lifecycleNoteBody(line) === legacy)) {
        return [...tagged, `[Closed] ${legacy}`];
    }
    return tagged;
}

export function formatWorkOrderDescriptionDisplay(wo: WorkOrderDescriptionSource): string {
    const base = getWorkOrderBaseDescription(wo);
    return base || 'No description provided.';
}

export function buildObservationsForComplete(
    wo: WorkOrderDescriptionSource,
    options: { executionObservations?: string },
): string | undefined {
    const execution = options.executionObservations?.trim();
    const preservedNotes = getWorkOrderLifecycleNotes(wo.observations).join('\n\n');

    const sections: string[] = [];
    if (execution) sections.push(execution);
    if (preservedNotes) sections.push(preservedNotes);

    const merged = sections.join('\n\n').trim();
    return merged || undefined;
}

export function getWorkOrderExecutionObservations(wo: WorkOrderDescriptionSource): string {
    const base = getWorkOrderBaseDescription(wo);
    const stripped = stripLifecycleNotes(wo.observations);
    const deduped = removeDuplicateClosureBodies(stripped, wo.observations);
    if (!deduped) return '';
    if (base && deduped === base) return '';
    if (base && deduped.startsWith(base)) {
        const rest = deduped.slice(base.length).replace(/^\n+/, '').trim();
        return stripLifecycleNotes(rest);
    }
    const legacy = getLegacyUntaggedClosure(wo);
    if (legacy && deduped === legacy) return '';
    return deduped;
}
