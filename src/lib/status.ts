// Section status — the single source for keys, Swedish labels, and display order.
// Keys are ASCII (no å/ö) because they are stored in D1; labels are UI-only.
// Imported by the schema, server logic, and components so there is no drift.

export const SECTION_STATUSES = ['ej_paborjad', 'pagar', 'klar'] as const;

export type SectionStatus = (typeof SECTION_STATUSES)[number];

export const STATUS_LABELS: Record<SectionStatus, string> = {
	ej_paborjad: 'Ej påbörjad',
	pagar: 'Pågår',
	klar: 'Klar'
};

export function isSectionStatus(value: string): value is SectionStatus {
	return (SECTION_STATUSES as readonly string[]).includes(value);
}
