<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/Button.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import Details from '$lib/components/Details.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import MoneyInput from '$lib/components/MoneyInput.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Two-step inline confirm state for destructive actions (one open at a time).
	let confirmSection = $state<number | null>(null);
	let confirmOption = $state<number | null>(null);
	let confirmDelete = $state<number | null>(null);
	let confirmDeleteSection = $state<number | null>(null);

	// Ordered ids of the non-archived sections — to disable move at the ends.
	const activeIds = $derived(data.sections.filter((s) => !s.archived).map((s) => s.id));

	const stop = (e: Event) => e.stopPropagation();

	const inputCls =
		'rounded-ctl border border-line bg-panel-2 px-2 py-1 text-sm text-ink placeholder:text-dim';
</script>

<section class="mt-6 rounded-card border border-line bg-panel p-5 shadow-card" aria-label="Budget">
	<span class="eyebrow">Budget</span>
	<form method="POST" action="?/setBudget" use:enhance class="mt-2 flex flex-wrap items-end gap-3">
		<div class="flex flex-col gap-1">
			<label for="total" class="text-[13px] text-dim">Total budget (kr)</label>
			<MoneyInput
				id="total"
				name="total"
				value={data.totalBudget}
				class="w-48 rounded-ctl border border-line bg-panel-2 px-2 py-1 font-display text-lg text-ink"
			/>
		</div>
		<Button variant="primary" size="md">Spara</Button>
	</form>
</section>

<section class="mt-8">
	<h2 class="font-display text-[15px] font-bold tracking-[0.1em] text-dim uppercase">Avsnitt</h2>

	<form method="POST" action="?/addSection" use:enhance class="mt-3 flex flex-wrap items-end gap-2">
		<div class="flex flex-1 flex-col gap-1">
			<label for="new-section" class="text-[13px] text-dim">Nytt avsnitt</label>
			<input
				id="new-section"
				name="name"
				required
				placeholder="t.ex. Tomt"
				class="{inputCls} w-full"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label for="new-section-cost" class="text-[13px] text-dim">Kostnad (kr, valfritt)</label>
			<MoneyInput
				id="new-section-cost"
				name="cost"
				placeholder="lämna tomt för att lägga alternativ senare"
				class="{inputCls} w-64"
			/>
		</div>
		<Button variant="primary" size="md">Lägg till avsnitt</Button>
	</form>

	{#if form && 'error' in form && form.error}
		<div
			class="mt-3 rounded-ctl border border-danger bg-danger-tint px-3.5 py-2.5 text-sm text-danger"
			role="alert"
		>
			{form.error}
		</div>
	{/if}

	{#if data.sections.length === 0}
		<EmptyState class="mt-4">
			Inga avsnitt ännu. Lägg till det första — t.ex. Tomt eller Bygglov.
		</EmptyState>
	{:else}
		<ul class="mt-4 grid list-none gap-3 p-0">
			{#each data.sections as s (s.id)}
				<li>
					<Details class="group {s.archived ? 'opacity-60' : ''}">
						{#snippet summary()}
							<div class="flex flex-wrap items-center gap-2 px-4 py-3">
								<span class="font-semibold">{s.name}</span>
								<StatusBadge status={s.status} />
								{#if s.archived}
									<span
										class="rounded-full border border-line-strong bg-panel-2 px-2 py-0.5 text-xs text-dim"
										>Arkiverad</span
									>
								{/if}

								<span class="ml-auto flex flex-wrap items-center gap-1">
									{#if !s.archived}
										<form method="POST" action="?/moveSection" use:enhance class="contents">
											<input type="hidden" name="sectionId" value={s.id} />
											<input type="hidden" name="dir" value="up" />
											<Button
												variant="secondary"
												size="sm"
												title="Flytta upp"
												aria-label="Flytta {s.name} upp"
												disabled={activeIds[0] === s.id}
												onclick={stop}>↑</Button
											>
										</form>
										<form method="POST" action="?/moveSection" use:enhance class="contents">
											<input type="hidden" name="sectionId" value={s.id} />
											<input type="hidden" name="dir" value="down" />
											<Button
												variant="secondary"
												size="sm"
												title="Flytta ner"
												aria-label="Flytta {s.name} ner"
												disabled={activeIds[activeIds.length - 1] === s.id}
												onclick={stop}>↓</Button
											>
										</form>
									{/if}

									{#if s.archived}
										<form method="POST" action="?/unarchiveSection" use:enhance class="contents">
											<input type="hidden" name="sectionId" value={s.id} />
											<Button
												variant="secondary"
												size="sm"
												title="Återställ avsnitt"
												aria-label="Återställ {s.name}"
												onclick={stop}>Återställ</Button
											>
										</form>
										{#if confirmDeleteSection === s.id}
											<form
												method="POST"
												action="?/deleteSection"
												use:enhance={() =>
													async ({ update }) => {
														confirmDeleteSection = null;
														await update();
													}}
												class="contents"
											>
												<input type="hidden" name="sectionId" value={s.id} />
												<Button
													variant="danger"
													size="sm"
													title="Bekräfta permanent borttagning"
													aria-label="Bekräfta permanent borttagning av {s.name}"
													onclick={stop}>Ta bort permanent</Button
												>
											</form>
											<Button
												variant="subtle"
												size="sm"
												type="button"
												onclick={(e: Event) => {
													stop(e);
													confirmDeleteSection = null;
												}}>Avbryt</Button
											>
										{:else}
											<Button
												variant="danger"
												size="sm"
												type="button"
												title="Ta bort avsnittet permanent (inkl. alternativ)"
												aria-label="Ta bort {s.name} permanent"
												onclick={(e: Event) => {
													stop(e);
													confirmDeleteSection = s.id;
												}}>Ta bort</Button
											>
										{/if}
									{:else if confirmSection === s.id}
										<form
											method="POST"
											action="?/archiveSection"
											use:enhance={() =>
												async ({ update }) => {
													confirmSection = null;
													await update();
												}}
											class="contents"
										>
											<input type="hidden" name="sectionId" value={s.id} />
											<Button
												variant="danger"
												size="sm"
												title="Bekräfta arkivering"
												aria-label="Bekräfta arkivering av {s.name}"
												onclick={stop}>Bekräfta</Button
											>
										</form>
										<Button
											variant="subtle"
											size="sm"
											type="button"
											onclick={(e: Event) => {
												stop(e);
												confirmSection = null;
											}}>Avbryt</Button
										>
									{:else}
										<Button
											variant="danger"
											size="sm"
											type="button"
											title="Arkivera avsnitt"
											aria-label="Arkivera {s.name}"
											onclick={(e: Event) => {
												stop(e);
												confirmSection = s.id;
											}}>Arkivera</Button
										>
									{/if}

									<span
										class="ml-1 inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-0.5 text-xs whitespace-nowrap text-accent-ink"
									>
										{s.options.length} alternativ
										<span class="group-[[open]]:hidden" aria-hidden="true">▾</span>
										<span class="hidden group-[[open]]:inline" aria-hidden="true">▴</span>
									</span>
								</span>
							</div>
						{/snippet}

						<div class="grid gap-4 px-4 py-4">
							<!-- Rename -->
							<form
								method="POST"
								action="?/renameSection"
								use:enhance
								class="flex flex-wrap items-end gap-2"
							>
								<input type="hidden" name="sectionId" value={s.id} />
								<div class="flex flex-1 flex-col gap-1">
									<label for="rename-{s.id}" class="text-[12px] text-dim">Namn</label>
									<input id="rename-{s.id}" name="name" value={s.name} class="{inputCls} w-full" />
								</div>
								<Button variant="secondary" size="sm">Byt namn</Button>
							</form>

							<!-- Options -->
							<div class="grid gap-2">
								<span class="eyebrow">Alternativ</span>
								{#if s.options.length === 0}
									<p class="text-[13px] text-dim">Inga alternativ ännu — lägg till nedan.</p>
								{:else}
									{#each s.options as o (o.id)}
										<div
											class="grid gap-2 rounded-ctl border border-line bg-panel-2 p-3 {o.archived
												? 'opacity-60'
												: ''}"
										>
											<form method="POST" action="?/editOption" use:enhance class="grid gap-2">
												<input type="hidden" name="optionId" value={o.id} />
												<div class="flex flex-wrap gap-2">
													<div class="flex min-w-[10rem] flex-1 flex-col gap-1">
														<label for="oname-{o.id}" class="text-[12px] text-dim">Namn</label>
														<input
															id="oname-{o.id}"
															name="name"
															value={o.name}
															class="{inputCls} w-full"
														/>
													</div>
													<div class="flex w-40 flex-col gap-1">
														<label for="ocost-{o.id}" class="text-[12px] text-dim"
															>Kostnad (kr)</label
														>
														<MoneyInput
															id="ocost-{o.id}"
															name="cost"
															value={o.cost}
															class="{inputCls} w-full"
														/>
													</div>
												</div>
												<div class="flex flex-col gap-1">
													<label for="odesc-{o.id}" class="text-[12px] text-dim">Beskrivning</label>
													<input
														id="odesc-{o.id}"
														name="description"
														value={o.description}
														class="{inputCls} w-full"
													/>
												</div>
												<div class="flex flex-col gap-1">
													<label for="ourl-{o.id}" class="text-[12px] text-dim"
														>Länk (valfritt)</label
													>
													<input
														id="ourl-{o.id}"
														name="url"
														type="url"
														value={o.url ?? ''}
														class="{inputCls} w-full"
													/>
												</div>
												<div><Button variant="secondary" size="sm">Spara ändringar</Button></div>
											</form>

											<div class="flex flex-wrap items-center gap-2">
												{#if o.archived}
													<span class="text-xs text-dim">Arkiverat</span>
													<form
														method="POST"
														action="?/unarchiveOption"
														use:enhance
														class="contents"
													>
														<input type="hidden" name="optionId" value={o.id} />
														<Button variant="subtle" size="sm">Återställ alternativ</Button>
													</form>
													{#if confirmDelete === o.id}
														<form
															method="POST"
															action="?/deleteOption"
															use:enhance={() =>
																async ({ update }) => {
																	confirmDelete = null;
																	await update();
																}}
															class="contents"
														>
															<input type="hidden" name="optionId" value={o.id} />
															<Button variant="danger" size="sm">Ta bort permanent</Button>
														</form>
														<Button
															variant="subtle"
															size="sm"
															type="button"
															onclick={() => (confirmDelete = null)}>Avbryt</Button
														>
													{:else}
														<Button
															variant="danger"
															size="sm"
															type="button"
															title="Ta bort alternativet permanent"
															aria-label="Ta bort {o.name} permanent"
															onclick={() => (confirmDelete = o.id)}>Ta bort</Button
														>
													{/if}
												{:else if confirmOption === o.id}
													<form
														method="POST"
														action="?/archiveOption"
														use:enhance={() =>
															async ({ update }) => {
																confirmOption = null;
																await update();
															}}
														class="contents"
													>
														<input type="hidden" name="optionId" value={o.id} />
														<Button variant="danger" size="sm">Bekräfta arkivering</Button>
													</form>
													<Button
														variant="subtle"
														size="sm"
														type="button"
														onclick={() => (confirmOption = null)}>Avbryt</Button
													>
												{:else}
													<Button
														variant="danger"
														size="sm"
														type="button"
														title="Arkivera alternativ"
														aria-label="Arkivera {o.name}"
														onclick={() => (confirmOption = o.id)}>Arkivera alternativ</Button
													>
												{/if}
											</div>
										</div>
									{/each}
								{/if}

								<!-- Add option -->
								<form
									method="POST"
									action="?/addOption"
									use:enhance
									class="grid gap-2 rounded-ctl border border-dashed border-line-strong p-3"
								>
									<input type="hidden" name="sectionId" value={s.id} />
									<span class="text-[13px] font-semibold text-ink">Lägg till alternativ</span>
									<div class="flex flex-wrap gap-2">
										<div class="flex min-w-[10rem] flex-1 flex-col gap-1">
											<label for="nname-{s.id}" class="text-[12px] text-dim">Namn</label>
											<input
												id="nname-{s.id}"
												name="name"
												required
												placeholder="t.ex. Betongpannor"
												class="{inputCls} w-full"
											/>
										</div>
										<div class="flex w-40 flex-col gap-1">
											<label for="ncost-{s.id}" class="text-[12px] text-dim">Kostnad (kr)</label>
											<MoneyInput
												id="ncost-{s.id}"
												name="cost"
												value={0}
												required
												class="{inputCls} w-full"
											/>
										</div>
									</div>
									<div class="flex flex-col gap-1">
										<label for="ndesc-{s.id}" class="text-[12px] text-dim"
											>Beskrivning (valfritt)</label
										>
										<input id="ndesc-{s.id}" name="description" class="{inputCls} w-full" />
									</div>
									<div class="flex flex-col gap-1">
										<label for="nurl-{s.id}" class="text-[12px] text-dim">Länk (valfritt)</label>
										<input id="nurl-{s.id}" name="url" type="url" class="{inputCls} w-full" />
									</div>
									<div><Button variant="primary" size="sm">Lägg till</Button></div>
								</form>
							</div>
						</div>
					</Details>
				</li>
			{/each}
		</ul>
	{/if}
</section>
