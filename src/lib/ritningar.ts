// Husritningarnas versionsmanifest — ingen databas, bara typad statisk data.
// Bladen ligger i static/ritningar/v{version}/ med STABILA filnamn (varje ny version
// återanvänder samma namn i sin egen mapp). NYASTE FÖRST: lägg alltid nya versioner
// överst i `ritningsversioner` så att index 0 är den senaste.

export type RitningsBlad = { fil: string; titel: string };

export type RitningsVersion = {
	version: string; // '0.1'
	datum: string; // '2026-07-18'
	titel: string;
	beskrivning: string;
	andringar: string[];
	blad: RitningsBlad[]; // fil = filnamn inuti /ritningar/v{version}/
};

// NYASTE FÖRST — lägg alltid nya versioner överst i listan.
export const ritningsversioner: RitningsVersion[] = [
	{
		version: '0.1',
		datum: '2026-07-18',
		titel: 'Riktiga Skanör + garageförlängning',
		beskrivning:
			'Basen är Fiskarhedenvillans Skanör (13,2 × 7,2 m invändigt, 1,5-plan, taklutning ca 38°). Garaget förlänger huvudkroppen 5,0 m åt norr under samma tak — totalt 19,0 × 8,0 m utvändigt. Skisser, ej bygglovshandling.',
		andringar: [
			'Bottenvåningen följer riktiga Skanör: tvätt, kök, vardagsrum, arbetsrum, hall, wc/d, entré',
			'Garage som 5,0 m förlängning av kroppen; tvättens dörr blir förbindelsen hus–garage',
			'Norra gaveln: en garageport 4,2 m åt öster + gångdörr åt väster',
			'Övervåningen speglad: master 14,4 + dress + bad åt söder, skjutparti mot balkongen',
			'Små sovrummen sammanslagna med sina klk (~12–13 m² styck)',
			'Passage mellan sovrummen leder till lägenheten över garaget (öppen studio + separat bad/wc)',
			'Uterum på södra gaveln med balkong ovanpå',
			'Östfasaden ritas spegelvänd (norr åt vänster) så alla blad läses åt samma håll'
		],
		blad: [
			{ fil: 'plan-bv.svg', titel: 'Plan — bottenvåning' },
			{ fil: 'plan-ov.svg', titel: 'Plan — övervåning' },
			{ fil: 'fasad-oster.svg', titel: 'Fasad mot öster (entréfasad)' },
			{ fil: 'fasad-norr.svg', titel: 'Fasad mot norr (garagegaveln)' }
		]
	}
];
