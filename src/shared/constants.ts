export const MEMBER_COLORS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'] as const;
export type MemberColor = (typeof MEMBER_COLORS)[number];

export const RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'yearly'] as const;
export type Recurrence = (typeof RECURRENCES)[number];
