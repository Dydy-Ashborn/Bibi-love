/* Bibi Love — banque de questions
 * Champs :
 *   i  id unique
 *   t  thème : quotidien | souvenirs | gouts | complicite
 *   s  niveau de piquant : 1 familial · 2 piquant · 3 très piquant
 *   k  type : 'self' (QCM sur soi) | 'who' (qui de vous deux)
 *   q  texte posé au joueur qui répond sur lui-même
 *   g  texte posé au conjoint qui devine ({p} = prénom du conjoint) — 'self' uniquement
 *   o  4 options — 'self' uniquement ; 'who' génère [A, B, Les deux, Ni l'un ni l'autre]
 * Un niveau N inclut toujours les niveaux inférieurs (pool cumulatif).
 */
export const QUESTIONS = [

/* ─────────── NIVEAU 1 — FAMILIAL ─────────── */

{i:'s101',t:'quotidien',s:1,k:'self',q:"Ton petit-déjeuner idéal, c'est plutôt…",g:"Le petit-déjeuner idéal de {p}, c'est plutôt…",o:["Salé","Sucré","Juste un café","Rien du tout"]},
{i:'s102',t:'quotidien',s:1,k:'self',q:"Quand tu rentres chez toi, la première chose que tu fais :",g:"Quand {p} rentre, la première chose qu'il/elle fait :",o:["Enlever ses chaussures","Ouvrir le frigo","Allumer la télé","Se poser sur le canapé"]},
{i:'s103',t:'quotidien',s:1,k:'self',q:"Ton réveil sonne. Tu…",g:"Le réveil de {p} sonne. Il/elle…",o:["Se lève direct","Snooze 3 fois minimum","Reste 20 min sur le téléphone","N'a pas besoin de réveil"]},
{i:'s104',t:'quotidien',s:1,k:'self',q:"La corvée ménagère que tu détestes le plus :",g:"La corvée ménagère que {p} déteste le plus :",o:["La vaisselle","Le repassage","Passer l'aspirateur","Nettoyer la salle de bain"]},
{i:'s105',t:'quotidien',s:1,k:'self',q:"Au restaurant, tu commandes…",g:"Au restaurant, {p} commande…",o:["Toujours la même chose","N'importe quoi de nouveau","La même chose que moi","Après 15 min d'hésitation"]},
{i:'s106',t:'quotidien',s:1,k:'self',q:"Ta température idéale sous la couette :",g:"La température idéale de {p} sous la couette :",o:["Fenêtre ouverte, ça caille","Normal, 19°","Chaud, 22° minimum","Sauna, avec le chauffage à fond"]},
{i:'s107',t:'quotidien',s:1,k:'self',q:"En voiture, tu es plutôt…",g:"En voiture, {p} est plutôt…",o:["Zen au volant","Insulteur professionnel","Toujours en retard donc pressé(e)","Passager(e), jamais conducteur(trice)"]},
{i:'s108',t:'quotidien',s:1,k:'self',q:"Le soir, tu t'endors…",g:"Le soir, {p} s'endort…",o:["En 2 minutes","Après 1h de téléphone","Devant une série","Difficilement, tu cogites"]},
{i:'s109',t:'quotidien',s:1,k:'self',q:"Ton rapport aux courses :",g:"Le rapport de {p} aux courses :",o:["Liste stricte, rien d'autre","Tout ce qui fait envie","Le strict minimum, vite fait","J'y vais jamais"]},
{i:'s110',t:'quotidien',s:1,k:'self',q:"Ta place au lit :",g:"La place de {p} au lit :",o:["Côté fenêtre","Côté porte","Le milieu, toujours","Ça change tout le temps"]},
{i:'s111',t:'gouts',s:1,k:'self',q:"Ton plat réconfort quand ça va pas :",g:"Le plat réconfort de {p} quand ça va pas :",o:["Des pâtes","Une pizza","Du chocolat","Un burger / fast-food"]},
{i:'s112',t:'gouts',s:1,k:'self',q:"Ta boisson par défaut en soirée :",g:"La boisson par défaut de {p} en soirée :",o:["Bière","Vin","Cocktail","Sans alcool"]},
{i:'s113',t:'gouts',s:1,k:'self',q:"Vacances de rêve :",g:"Les vacances de rêve de {p} :",o:["Plage et rien faire","Randonnée / montagne","City trip culturel","Roadtrip à l'aventure"]},
{i:'s114',t:'gouts',s:1,k:'self',q:"Ton genre de film le vendredi soir :",g:"Le genre de film de {p} le vendredi soir :",o:["Comédie","Action","Horreur","Romance"]},
{i:'s115',t:'gouts',s:1,k:'self',q:"Si tu gagnes 10 000 €, tu…",g:"Si {p} gagne 10 000 €, il/elle…",o:["Met tout de côté","Part en voyage","Rembourse des trucs","Claque tout en plaisirs"]},
{i:'s116',t:'gouts',s:1,k:'self',q:"Ton animal préféré :",g:"L'animal préféré de {p} :",o:["Chien","Chat","Un truc exotique","Aucun, merci"]},
{i:'s117',t:'gouts',s:1,k:'self',q:"Ta pire habitude alimentaire :",g:"La pire habitude alimentaire de {p} :",o:["Grignoter la nuit","Ne jamais finir son assiette","Manger trop vite","Le sucre en continu"]},
{i:'s118',t:'gouts',s:1,k:'self',q:"Le cadeau qui te fait le plus plaisir :",g:"Le cadeau qui fait le plus plaisir à {p} :",o:["Un truc fait main","Un truc cher","Une expérience à deux","Une surprise totale"]},
{i:'s119',t:'gouts',s:1,k:'self',q:"Ton style musical honteux :",g:"Le style musical honteux de {p} :",o:["Variété française","Années 80","Rap commercial","Musique de Noël"]},
{i:'s120',t:'gouts',s:1,k:'self',q:"Le sport que tu ferais si tu avais le courage :",g:"Le sport que {p} ferait s'il/elle avait le courage :",o:["La salle","La course","Un sport de combat","La danse"]},
{i:'s121',t:'souvenirs',s:1,k:'self',q:"Votre premier rendez-vous, c'était…",g:"Votre premier rendez-vous, selon {p} :",o:["Un resto","Un bar / soirée","Une balade","Directement chez l'un des deux"]},
{i:'s122',t:'souvenirs',s:1,k:'self',q:"Ta première impression sur lui/elle :",g:"La première impression de {p} sur toi :",o:["Coup de foudre","Sympa, sans plus","Trop sûr(e) de lui/elle","Aucune idée, je m'en souviens pas"]},
{i:'s123',t:'souvenirs',s:1,k:'self',q:"Qui a fait le premier pas ?",g:"Selon {p}, qui a fait le premier pas ?",o:["Moi clairement","Lui/elle clairement","On sait pas, c'est venu tout seul","Un ami nous a poussés"]},
{i:'s124',t:'souvenirs',s:1,k:'self',q:"Votre premier voyage ensemble s'est passé…",g:"Votre premier voyage ensemble, selon {p} :",o:["Parfaitement","Avec une grosse dispute","Avec un imprévu mémorable","On n'en a pas encore fait"]},
{i:'s125',t:'souvenirs',s:1,k:'self',q:"Le premier « je t'aime », c'était…",g:"Le premier « je t'aime », selon {p} :",o:["Très vite","Après plusieurs mois","Pendant une dispute","Après un verre de trop"]},
{i:'s126',t:'souvenirs',s:1,k:'self',q:"La rencontre avec ses parents, c'était…",g:"La rencontre de {p} avec tes parents, c'était…",o:["Un carton plein","Gênant mais ok","Une catastrophe","Pas encore fait"]},
{i:'s127',t:'souvenirs',s:1,k:'self',q:"Votre plus belle soirée ensemble :",g:"La plus belle soirée du couple selon {p} :",o:["Un anniversaire","Un voyage","Une soirée improvisée à la maison","Un mariage / une fête de famille"]},
{i:'s128',t:'complicite',s:1,k:'self',q:"Ton surnom pour lui/elle :",g:"Le surnom que {p} te donne :",o:["Bébé / Bibi","Mon cœur / Chéri(e)","Un truc ridicule","Juste son prénom"]},
{i:'s129',t:'complicite',s:1,k:'self',q:"Quand tu es contrarié(e), tu…",g:"Quand {p} est contrarié(e), il/elle…",o:["Le dis direct","Boude en silence","Fais comme si de rien n'était","Pars faire un tour"]},
{i:'s130',t:'complicite',s:1,k:'self',q:"Après une dispute, qui s'excuse en premier ?",g:"Selon {p}, qui s'excuse en premier ?",o:["Moi","Lui/elle","Personne, ça passe tout seul","Ça dépend du sujet"]},
{i:'s131',t:'complicite',s:1,k:'self',q:"Le truc qui t'agace le plus chez lui/elle :",g:"Le truc qui agace le plus {p} chez toi :",o:["Le désordre","Le retard","Le téléphone","La façon de conduire"]},
{i:'s132',t:'complicite',s:1,k:'self',q:"Dans 10 ans, vous serez…",g:"Dans 10 ans selon {p}, vous serez…",o:["Au même endroit","Ailleurs, à l'étranger","Avec (plus) d'enfants","Aucune idée, on verra"]},
{i:'s133',t:'complicite',s:1,k:'self',q:"Ce que tu ferais si tu étais seul(e) tout un week-end :",g:"Ce que {p} ferait s'il/elle était seul(e) tout un week-end :",o:["Rien du tout, canapé","Voir des amis","Faire du tri / du ménage","Un truc que je ne fais jamais"]},
{i:'w101',t:'quotidien',s:1,k:'who',q:"Qui met le plus de temps à se préparer ?"},
{i:'w102',t:'quotidien',s:1,k:'who',q:"Qui laisse traîner ses affaires partout ?"},
{i:'w103',t:'quotidien',s:1,k:'who',q:"Qui cuisine le mieux ?"},
{i:'w104',t:'quotidien',s:1,k:'who',q:"Qui ronfle ?"},
{i:'w105',t:'quotidien',s:1,k:'who',q:"Qui vole la couette la nuit ?"},
{i:'w106',t:'quotidien',s:1,k:'who',q:"Qui est le plus dépensier ?"},
{i:'w107',t:'quotidien',s:1,k:'who',q:"Qui passe le plus de temps sur son téléphone ?"},
{i:'w108',t:'quotidien',s:1,k:'who',q:"Qui est le plus souvent en retard ?"},
{i:'w109',t:'quotidien',s:1,k:'who',q:"Qui décide de ce qu'on regarde le soir ?"},
{i:'w110',t:'quotidien',s:1,k:'who',q:"Qui conduit le mieux ?"},
{i:'w111',t:'complicite',s:1,k:'who',q:"Qui est le plus jaloux ?"},
{i:'w112',t:'complicite',s:1,k:'who',q:"Qui a le plus mauvais caractère le matin ?"},
{i:'w113',t:'complicite',s:1,k:'who',q:"Qui craque le plus vite en cas de dispute ?"},
{i:'w114',t:'complicite',s:1,k:'who',q:"Qui est le plus romantique ?"},
{i:'w115',t:'complicite',s:1,k:'who',q:"Qui raconte le plus de bêtises en soirée ?"},
{i:'w116',t:'complicite',s:1,k:'who',q:"Qui tient le moins bien l'alcool ?"},
{i:'w117',t:'complicite',s:1,k:'who',q:"Qui a le plus besoin de l'autre ?"},
{i:'w118',t:'complicite',s:1,k:'who',q:"Qui ment le mieux ?"},
{i:'w119',t:'complicite',s:1,k:'who',q:"Qui est le plus rancunier ?"},
{i:'w120',t:'complicite',s:1,k:'who',q:"Qui pleure devant un film ?"},
{i:'w121',t:'gouts',s:1,k:'who',q:"Qui a le pire goût vestimentaire ?"},
{i:'w122',t:'gouts',s:1,k:'who',q:"Qui a la playlist la plus honteuse ?"},
{i:'w123',t:'gouts',s:1,k:'who',q:"Qui mange le plus ?"},
{i:'w124',t:'souvenirs',s:1,k:'who',q:"Qui était le plus stressé au premier rendez-vous ?"},
{i:'w125',t:'souvenirs',s:1,k:'who',q:"Qui a dit « je t'aime » en premier ?"},
{i:'w126',t:'souvenirs',s:1,k:'who',q:"Qui oublie le plus souvent une date importante ?"},
{i:'w127',t:'souvenirs',s:1,k:'who',q:"Qui raconte le mieux l'histoire de votre rencontre ?"},

/* ─────────── NIVEAU 2 — PIQUANT ─────────── */

{i:'s201',t:'complicite',s:2,k:'self',q:"Le petit mensonge que tu lui as déjà sorti :",g:"Le petit mensonge que {p} t'a déjà sorti :",o:["« J'arrive dans 5 minutes »","« Non, ça ne se voit pas »","« J'ai adoré ton cadeau »","Je ne mens jamais (mytho)"]},
{i:'s202',t:'complicite',s:2,k:'self',q:"Tu as déjà fouillé dans son téléphone ?",g:"Selon toi, {p} a déjà fouillé dans ton téléphone ?",o:["Jamais","Une fois","Régulièrement","Je n'ai pas le code"]},
{i:'s203',t:'complicite',s:2,k:'self',q:"Le truc de lui/elle que tu ne dirais jamais à ta mère :",g:"Le truc de toi que {p} ne dirait jamais à sa mère :",o:["Sa façon de gérer l'argent","Sa famille","Ce qu'on fait le week-end","Rien, ma mère sait tout"]},
{i:'s204',t:'complicite',s:2,k:'self',q:"S'il/elle disparaissait un mois sans explication, tu…",g:"Si tu disparaissais un mois, {p}…",o:["Appelle la police","Appelle son/sa ex","M'inquiète en silence","Profite du calme"]},
{i:'s205',t:'complicite',s:2,k:'self',q:"Ce que tu changerais chez lui/elle d'un claquement de doigts :",g:"Ce que {p} changerait chez toi d'un claquement de doigts :",o:["Le caractère","Les habitudes","La famille","Rien, franchement"]},
{i:'s206',t:'complicite',s:2,k:'self',q:"Ton pire défaut, celui qu'il/elle citerait en premier :",g:"Le pire défaut de {p}, celui que tu cites en premier :",o:["Têtu(e)","Bordélique","Jaloux(se)","Râleur(se)"]},
{i:'s207',t:'complicite',s:2,k:'self',q:"Combien de fois par semaine vous vous engueulez ?",g:"Selon {p}, combien de fois par semaine vous vous engueulez ?",o:["Jamais","Une fois","2 à 3 fois","Tous les jours"]},
{i:'s208',t:'souvenirs',s:2,k:'self',q:"Ton avis honnête sur son/sa ex :",g:"L'avis honnête de {p} sur ton/ta ex :",o:["Sans intérêt","Franchement mieux que prévu","Je préfère ne pas y penser","Je ne l'ai jamais vu(e)"]},
{i:'s209',t:'souvenirs',s:2,k:'self',q:"Le pire cadeau qu'il/elle t'ait offert :",g:"Le pire cadeau que tu aies offert à {p} :",o:["Un truc pratique","Un truc moche","Un truc pour lui/elle en fait","Aucun, tout était bien"]},
{i:'s210',t:'souvenirs',s:2,k:'self',q:"La bêtise que tu ne lui as jamais avouée :",g:"La bêtise que {p} ne t'a jamais avouée :",o:["Un truc cassé","Une somme dépensée","Un message envoyé","Il n'y en a pas"]},
{i:'s211',t:'souvenirs',s:2,k:'self',q:"Vous avez déjà failli vous séparer ?",g:"Selon {p}, vous avez déjà failli vous séparer ?",o:["Jamais","Une fois","Plusieurs fois","On l'a fait puis on est revenus"]},
{i:'s212',t:'gouts',s:2,k:'self',q:"La célébrité pour laquelle il/elle te pardonnerait un écart :",g:"La célébrité pour laquelle {p} te pardonnerait un écart :",o:["Personne, jamais","Une star de cinéma","Un(e) chanteur(se)","Un(e) sportif(ve)"]},
{i:'s213',t:'gouts',s:2,k:'self',q:"Sa partie du corps que tu préfères :",g:"Ta partie du corps que {p} préfère :",o:["Les yeux","Le sourire","Les fesses","Les mains"]},
{i:'s214',t:'gouts',s:2,k:'self',q:"Sa tenue qui te fait le plus d'effet :",g:"Ta tenue qui fait le plus d'effet à {p} :",o:["Chic, habillé(e)","Décontracté(e), à la maison","Le vêtement de sport","Le peignoir du dimanche"]},
{i:'s215',t:'quotidien',s:2,k:'self',q:"Ce que tu fais quand il/elle n'est pas là :",g:"Ce que {p} fait quand tu n'es pas là :",o:["Rien de spécial","Des trucs interdits en temps normal","Il/elle m'appelle toutes les heures","Je préfère ne pas savoir"]},
{i:'s216',t:'quotidien',s:2,k:'self',q:"Dans la salle de bain, tu es…",g:"Dans la salle de bain, {p} est…",o:["Rapide et efficace","Une heure minimum","Chanteur(se) professionnel(le)","Toujours en train de me réclamer un truc"]},
{i:'s217',t:'quotidien',s:2,k:'self',q:"Le sujet tabou chez vous :",g:"Le sujet tabou chez {p} :",o:["L'argent","La belle-famille","Les ex","Le ménage"]},
{i:'s218',t:'quotidien',s:2,k:'self',q:"Si on ouvrait ton historique de recherche là maintenant :",g:"Si on ouvrait l'historique de recherche de {p} :",o:["Aucun souci","Un peu la honte","Panique totale","Il est vidé toutes les heures"]},
{i:'s219',t:'complicite',s:2,k:'self',q:"Ton avis sur ses amis :",g:"L'avis de {p} sur tes amis :",o:["Je les adore","Il y en a un que je supporte pas","Je les évite","Je ne les connais pas"]},
{i:'s220',t:'complicite',s:2,k:'self',q:"Ce que tu ferais s'il/elle prenait 20 kilos :",g:"Ce que {p} ferait si tu prenais 20 kilos :",o:["Rien, je m'en fiche","Je l'inscris à la salle","J'en prends aussi","On en reparle"]},
{i:'w201',t:'complicite',s:2,k:'who',q:"Qui a le plus flirté depuis que vous êtes ensemble ?"},
{i:'w202',t:'complicite',s:2,k:'who',q:"Qui a déjà lu les messages de l'autre en douce ?"},
{i:'w203',t:'complicite',s:2,k:'who',q:"Qui dit le plus souvent « on verra » pour éviter un sujet ?"},
{i:'w204',t:'complicite',s:2,k:'who',q:"Qui simule le plus souvent d'écouter l'autre ?"},
{i:'w205',t:'complicite',s:2,k:'who',q:"Qui serait le plus vite remplacé(e) en cas de rupture ?"},
{i:'w206',t:'complicite',s:2,k:'who',q:"Qui parle le plus de l'autre à ses amis ?"},
{i:'w207',t:'complicite',s:2,k:'who',q:"Qui a le plus besoin de compliments ?"},
{i:'w208',t:'complicite',s:2,k:'who',q:"Qui craquerait en premier après une semaine sans se parler ?"},
{i:'w209',t:'quotidien',s:2,k:'who',q:"Qui laisse le plus l'autre gérer les corvées ?"},
{i:'w210',t:'quotidien',s:2,k:'who',q:"Qui cache des achats à l'autre ?"},
{i:'w211',t:'quotidien',s:2,k:'who',q:"Qui a le téléphone le plus verrouillé ?"},
{i:'w212',t:'quotidien',s:2,k:'who',q:"Qui se plaint le plus d'être fatigué ?"},
{i:'w213',t:'gouts',s:2,k:'who',q:"Qui se regarde le plus dans le miroir ?"},
{i:'w214',t:'gouts',s:2,k:'who',q:"Qui a le plus changé physiquement depuis la rencontre ?"},
{i:'w215',t:'gouts',s:2,k:'who',q:"Qui drague le mieux ?"},
{i:'w216',t:'souvenirs',s:2,k:'who',q:"Qui a eu le plus d'histoires avant celle-ci ?"},
{i:'w217',t:'souvenirs',s:2,k:'who',q:"Qui a déjà parlé de l'autre à son/sa ex ?"},
{i:'w218',t:'souvenirs',s:2,k:'who',q:"Qui garde le plus de souvenirs de son passé amoureux ?"},

/* ─────────── NIVEAU 3 — TRÈS PIQUANT ─────────── */

{i:'s301',t:'complicite',s:3,k:'self',q:"Le moment de la journée que tu préfères pour un câlin :",g:"Le moment préféré de {p} pour un câlin :",o:["Le matin","L'après-midi","Le soir","En pleine nuit"]},
{i:'s302',t:'complicite',s:3,k:'self',q:"L'endroit le plus insolite où vous vous êtes embrassés :",g:"L'endroit le plus insolite où vous vous êtes embrassés, selon {p} :",o:["Dans une voiture","Chez des amis","Dans un lieu public","Au boulot"]},
{i:'s303',t:'complicite',s:3,k:'self',q:"Qui prend l'initiative le plus souvent au lit ?",g:"Selon {p}, qui prend l'initiative le plus souvent ?",o:["Moi","Lui/elle","C'est équilibré","Personne en ce moment"]},
{i:'s304',t:'complicite',s:3,k:'self',q:"Ta pire excuse pour dire non le soir :",g:"La pire excuse de {p} pour dire non le soir :",o:["« Je suis crevé(e) »","« J'ai mal à la tête »","« Demain, promis »","Je ne dis jamais non"]},
{i:'s305',t:'complicite',s:3,k:'self',q:"Le fantasme que tu n'as jamais osé lui dire :",g:"Le fantasme que {p} n'a jamais osé te dire :",o:["Un lieu particulier","Un déguisement","Une surprise","Il n'y en a pas, on se dit tout"]},
{i:'s306',t:'complicite',s:3,k:'self',q:"Vos voisins ont déjà entendu quelque chose ?",g:"Selon {p}, vos voisins ont déjà entendu quelque chose ?",o:["Jamais","Sûrement","Ils nous l'ont dit","On s'en fiche"]},
{i:'s307',t:'complicite',s:3,k:'self',q:"La pièce de la maison la plus « visitée » après la chambre :",g:"Selon {p}, la pièce la plus « visitée » après la chambre :",o:["Le salon","La cuisine","La salle de bain","Aucune, on est classiques"]},
{i:'s308',t:'complicite',s:3,k:'self',q:"Ce qui te fait le plus craquer chez lui/elle :",g:"Ce qui fait le plus craquer {p} chez toi :",o:["La voix","Le regard","Le parfum","Le sens de l'humour"]},
{i:'s309',t:'complicite',s:3,k:'self',q:"Le plus long sans se toucher depuis que vous êtes ensemble :",g:"Selon {p}, le plus long sans se toucher :",o:["Quelques jours","Une semaine","Un mois","Plus que ça"]},
{i:'s310',t:'complicite',s:3,k:'self',q:"Tu as déjà fait semblant d'aimer quelque chose au lit ?",g:"Selon toi, {p} a déjà fait semblant d'aimer quelque chose au lit ?",o:["Jamais","Une fois","Souvent","Je préfère ne pas répondre"]},
{i:'s311',t:'complicite',s:3,k:'self',q:"Le vêtement de lui/elle que tu préfères… au sol :",g:"Le vêtement de toi que {p} préfère… au sol :",o:["La chemise","Le jean","Le pull","Tout, dans l'ordre"]},
{i:'s312',t:'souvenirs',s:3,k:'self',q:"Votre première nuit ensemble, c'était :",g:"Votre première nuit ensemble selon {p} :",o:["Inoubliable","Gênante","Trop rapide","On a juste dormi"]},
{i:'s313',t:'souvenirs',s:3,k:'self',q:"Le lieu de vos meilleures vacances… pour de mauvaises raisons :",g:"Selon {p}, le lieu de vos meilleures vacances… pour de mauvaises raisons :",o:["L'hôtel","La tente","Chez la famille","La voiture"]},
{i:'s314',t:'quotidien',s:3,k:'self',q:"Vous vous êtes déjà réconciliés… autrement qu'en parlant ?",g:"Selon {p}, vous vous êtes déjà réconciliés autrement qu'en parlant ?",o:["Systématiquement","Souvent","Une ou deux fois","Jamais"]},
{i:'s315',t:'quotidien',s:3,k:'self',q:"À quelle fréquence tu dirais que c'est idéal ?",g:"Selon {p}, la fréquence idéale, ce serait :",o:["Tous les jours","2-3 fois par semaine","Une fois par semaine","Quand ça vient"]},
{i:'s316',t:'gouts',s:3,k:'self',q:"Un plan à trois, ta réaction si il/elle en parlait :",g:"La réaction de {p} si tu en parlais :",o:["Hors de question","J'en rigolerais","Je poserais des questions","On en a déjà parlé"]},
{i:'s317',t:'gouts',s:3,k:'self',q:"Le truc le plus osé que tu aies déjà acheté :",g:"Le truc le plus osé que {p} ait déjà acheté :",o:["De la lingerie","Un accessoire","Rien du tout","Je ne dirai rien"]},
{i:'w301',t:'complicite',s:3,k:'who',q:"Qui s'endort le premier après ?"},
{i:'w302',t:'complicite',s:3,k:'who',q:"Qui est le plus démonstratif en public ?"},
{i:'w303',t:'complicite',s:3,k:'who',q:"Qui a le plus d'imagination au lit ?"},
{i:'w304',t:'complicite',s:3,k:'who',q:"Qui dit le plus souvent non ?"},
{i:'w305',t:'complicite',s:3,k:'who',q:"Qui a envoyé la photo la plus osée à l'autre ?"},
{i:'w306',t:'complicite',s:3,k:'who',q:"Qui prend le plus de temps dans la salle de bain avant une soirée à deux ?"},
{i:'w307',t:'complicite',s:3,k:'who',q:"Qui fait le plus de bruit ?"},
{i:'w308',t:'complicite',s:3,k:'who',q:"Qui a déjà pensé à quelqu'un d'autre ?"},
{i:'w309',t:'souvenirs',s:3,k:'who',q:"Qui a pris l'initiative la première fois ?"},
{i:'w310',t:'souvenirs',s:3,k:'who',q:"Qui a été le plus surpris la première nuit ?"},
{i:'w311',t:'gouts',s:3,k:'who',q:"Qui est le plus pudique des deux ?"},
{i:'w312',t:'gouts',s:3,k:'who',q:"Qui oserait le plus faire un truc interdit en public ?"}

];

export const THEMES = {
  quotidien:   { label:'Quotidien',   emoji:'🏠' },
  souvenirs:   { label:'Souvenirs',   emoji:'📸' },
  gouts:       { label:'Goûts',       emoji:'💫' },
  complicite:  { label:'Complicité',  emoji:'❤️‍🔥' }
};

export const SPICE = {
  1: { key:'familial',     label:'Familial',      hint:'Apéro, belle-famille, enfants dans la pièce.' },
  2: { key:'piquant',      label:'Piquant',       hint:'Entre potes. Ça pique, ça révèle, ça reste correct.' },
  3: { key:'tres_piquant', label:'Très piquant',  hint:'Soirée à deux couples complices. Prévoyez les fous rires.' }
};

/** Pool cumulatif : le niveau choisi inclut tous les niveaux inférieurs. */
export function poolForSpice(maxSpice) {
  return QUESTIONS.filter(q => q.s <= maxSpice);
}

export function byId(id) {
  return QUESTIONS.find(q => q.i === id) || null;
}
