'use client'

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      common: {
        brand: 'GrantMatch NB',
        language: 'Language',
        english: 'English',
        french: 'Français',
        backHome: 'Back to Home',
        runNewQuiz: 'Run New Quiz',
        reviewImportedGrants: 'Review Imported Grants',
        close: 'Close',
        cancel: 'Cancel',
        submit: 'Submit',
        loading: 'Loading...',
        saving: 'Saving...',
        yes: 'Yes',
        no: 'No',
        unknown: 'Unknown',
        notSpecified: 'Not specified',
        organizationNotSpecified: 'Organization not specified',
        unnamedProgram: 'Unnamed Program',
      },

      home: {
        navButton: 'Find My Grants',
        pill: 'Built for New Brunswick Businesses • Bilingual EN/FR',
        heroTitle1: 'Stop leaving NB funding',
        heroTitle2: 'on the table.',
        heroText:
          'Government grants, loans and tax credits — matched to your NB business in minutes. In English or French.',
        heroButton: 'Find My Grants — Free →',
        subText: 'No credit card required • Takes 5 minutes',
        stats1Label: 'NB funding programs tracked',
        stats2Label: 'Average top match value',
        stats3Label: 'To see your matches',
        howItWorks: 'How it works',
        step1Title: 'Answer 6 questions',
        step1Body:
          'Tell us about your business — industry, stage, goals, and funding preference.',
        step2Title: 'AI finds your matches',
        step2Body:
          'We scan New Brunswick funding programs and rank the ones that best fit your profile.',
        step3Title: 'Apply with confidence',
        step3Body:
          'See why you match, what funding may be available, and where to apply next.',
        footer:
          'Built in Fredericton, New Brunswick • For every NB business, in English and French',
      },

      quiz: {
        badge: 'NB Funding Match Quiz',
        questionCounter: 'Question {{current}} of {{total}}',
        progressComplete: '{{value}}% complete',
        savingAnswers:
          'Saving your answers and preparing your personalized matches...',
        back: '← Back to previous question',
        stepIndicator: 'Step {{current}} / {{total}}',
        saveError: 'Could not save your profile. Please try again.',
        unexpectedError: 'Something went wrong while saving your answers.',

        industry_question: 'What industry is your business in?',
        industry_subtitle: 'Choose the closest match',

        stage_question: 'What stage is your business at?',
        stage_subtitle: 'This helps us match the right programs',

        employees_question: 'How many employees do you have?',
        employees_subtitle: 'Including yourself',

        does_rd_question: 'Do you do research or innovation work?',
        does_rd_subtitle:
          'This includes new products, technology, or process innovation',

        goal_question: 'What is your primary funding goal right now?',
        goal_subtitle: 'Pick the most important one',

        funding_preference_question: 'What type of funding do you prefer?',
        funding_preference_subtitle: 'This helps prioritize better matches',

        industry_opt_1: 'Technology / Software',
        industry_opt_2: 'Clean Energy / Cleantech',
        industry_opt_3: 'Manufacturing',
        industry_opt_4: 'Agriculture / Food',
        industry_opt_5: 'Health & Life Sciences',
        industry_opt_6: 'Retail / Hospitality',
        industry_opt_7: 'Professional Services',
        industry_opt_8: 'Construction',
        industry_opt_9: 'Media / Creative',
        industry_opt_11: 'Arts, Culture & Creative Industries',
        industry_opt_10: 'Other',

        stage_opt_1: 'Idea / Pre-revenue',
        stage_opt_2: 'Startup',
        stage_opt_3: 'Growth',
        stage_opt_4: 'Established',

        employees_opt_1: 'Just me (1)',
        employees_opt_2: '2–4 employees',
        employees_opt_3: '5–15 employees',
        employees_opt_4: '16–50 employees',
        employees_opt_5: '50+ employees',

        does_rd_opt_1: 'Yes — strong R&D / innovation focus',
        does_rd_opt_2: 'Some — occasional innovation work',
        does_rd_opt_3: 'No — mainly operations or services',

        goal_opt_1: 'Hiring staff',
        goal_opt_2: 'Product development / innovation',
        goal_opt_3: 'R&D / commercialization',
        goal_opt_4: 'Export / new markets',
        goal_opt_5: 'Equipment / capital investment',
        goal_opt_6: 'Digital adoption / automation',
        goal_opt_7: 'Training employees',
        goal_opt_8: 'Sustainability / energy efficiency',
        goal_opt_9: 'General business growth',

        funding_preference_opt_1: 'Grants only (non-repayable)',
        funding_preference_opt_2: 'Prefer grants, open to loans',
        funding_preference_opt_3: 'Open to both grants and loans',

        business_location_question: 'Where is your business located?',
business_location_subtitle: 'This helps identify region-specific programs',
business_location_opt_1: 'Fredericton',
business_location_opt_2: 'Moncton',
business_location_opt_3: 'Saint John',
business_location_opt_4: 'Other New Brunswick',
business_location_opt_5: 'Outside New Brunswick',

expansion_investment_question: 'Are you planning business expansion or equipment investment?',
expansion_investment_subtitle: 'This helps identify capital and development programs',
expansion_investment_opt_1: 'Yes',
expansion_investment_opt_2: 'No',
expansion_investment_opt_3: 'Not sure',

funding_need_type_question: 'What type of funding are you looking for most?',
funding_need_type_subtitle: 'We will prioritize the most relevant opportunities',
funding_need_type_opt_1: 'Grant',
funding_need_type_opt_2: 'Loan',
funding_need_type_opt_3: 'Investment',
funding_need_type_opt_4: 'Tax Credit',
funding_need_type_opt_5: 'Not sure',

innovation_depth_question: 'Is your business developing new technology or innovative products?',
innovation_depth_subtitle: 'Important for innovation-focused programs',
innovation_depth_opt_1: 'Yes - core focus',
innovation_depth_opt_2: 'Some innovation',
innovation_depth_opt_3: 'No',

ownership_type_question: 'How would you describe the business ownership?',
ownership_type_subtitle: 'Some programs are designed for specific founder groups',
ownership_type_opt_1: 'Women-led',
ownership_type_opt_2: 'Indigenous-led',
ownership_type_opt_3: 'Youth-led',
ownership_type_opt_4: 'General',
      },

      
      results: {
        loadingTitle: 'Finding your best grant matches...',
        loadingText:
          'We are reviewing New Brunswick funding programs based on your answers.',
        errorTitle: 'Something went wrong',
        resultsReady: '✓ Results Ready',
        heroTitle: 'Your New Brunswick Funding Matches',
        heroText:
          'We selected the strongest funding opportunities for your business based on your profile and matching criteria.',
        heroNotice:
          'We evaluated {{count}} New Brunswick funding programs. Your free preview shows {{visible}} match{{suffix}}. Your premium report includes all best-fit opportunities found for your business.',
        yourProfile: 'Your profile',
        yourProfileSubtitle:
          'This information was used to calculate your personalized funding matches.',
        personalizedMatchProfile: 'Personalized Match Profile',
        industry: 'Industry',
        stage: 'Stage',
        employees: 'Employees',
        doesRd: 'Does R&D',
        goal: 'Goal',
        recommendedFundingStack: 'Recommended Funding Stack',
        recommendedFundingStackSubtitle:
          'A suggested combination of programs that may work well together.',
        smartCombination: 'Smart Combination',
        estimatedCombinedFunding: 'Estimated Combined Funding',
        notFullySpecified: 'Not fully specified',
        whyThisStackMayWork: 'Why this stack may work',
        deadlineAlerts: 'Deadline Alerts',
        deadlineAlertsSubtitle:
          'Get notified when matched grants have upcoming application deadlines.',
        retentionFeature: 'Retention Feature',
        emailAddress: 'Email address',
        days3: '3 days before',
        days7: '7 days before',
        days14: '14 days before',
        enableDeadlineAlerts: 'Enable Deadline Alerts',
        deadlineAlertsEnabled: 'Deadline alerts enabled successfully.',
        noPrograms: 'No active New Brunswick funding programs are available yet.',
        topMatch: 'TOP MATCH',
        maximumAmount: 'Maximum Amount',
        fundingType: 'Funding Type',
        status: 'Status',
        eligibility: 'Eligibility',
        whyThisMatches: 'Why this matches',
        viewGrantDetails: 'View Grant Details →',
        premiumReport: 'Premium Report',
        unlockTitle: 'Unlock your complete funding report',
        unlockText:
          'We found {{count}} best-fit program{{suffix}} for your business. Your free preview shows {{visible}}. Request the full report to unlock the remaining {{remaining}}.',
        payFeature1:
          '✓ Access your full premium report with all best-fit opportunities found for your business',
        payFeature2: '✓ See funding amounts for each opportunity',
        payFeature3:
          '✓ Funding type clarity — Grant (No repayment) or Loan (Repayment required)',
        payFeature4:
          '✓ Full eligibility breakdown tailored to your business',
        payFeature5:
          '✓ Professional Application Draft to Kickstart Your Submission (Ready to Customize)',
        payFeature6: '✓ Download application drafts as Word or PDF',
        payFeature7: '✓ Generate drafts in English or French',
        payFeature8: '✓ Priority ranking — know where to apply first',
        payFeature9: '✓ Save hours of manual research',
        paywallTrust:
          'Built for New Brunswick businesses • No subscription • Request access now',
        premiumAccess: 'Premium access',
        requestFullReport: 'Request Full Report',
        nextSteps: 'We’ll contact you with next steps',
        requestFullReportButton: 'Request Full Report →',
        moreOpportunities: 'Your premium report includes more opportunities',
        moreOpportunitiesText:
          'Your free preview shows {{visible}} match{{suffix}}. Upgrade to unlock the remaining {{remaining}} opportunit{{opSuffix}} selected for your business.',
        draftGenerator: 'Application Draft Generator',
        draftGeneratorSubtitle:
          'Generate a professional application draft based on your profile and matched opportunities.',
        draftLanguage: 'Draft language',
        generateDraft: 'Generate Draft',
        applicationDraft: 'Application Draft',
        draftIntro:
          'This draft is based on your business profile and the selected funding opportunity. Review and refine it before submitting.',
        generatingDraft: 'Generating your draft...',
        executiveSummary: 'Executive Summary',
        businessOverview: 'Business Overview',
        projectAlignment: 'Project Alignment',
        useOfFunds: 'Use of Funds',
        expectedImpact: 'Expected Impact',
        closingStatement: 'Closing Statement',
        copyDraft: 'Copy Draft',
        downloadWord: 'Download Word',
        downloadPdf: 'Download PDF',
        premiumFeature: 'Premium Feature',
        requestModalTitle: 'Request Full Report',
        requestModalText:
          'Submit your details and we’ll contact you regarding the complete funding report.',
        businessName: 'Business Name',
        emailAddressCapital: 'Email Address',
        phoneNumber: 'Phone Number',
        optionalNotes: 'Optional Notes',
        submitting: 'Submitting...',
        submitRequest: 'Submit Request',
        requestSubmitted: 'Request Submitted',
        requestSubmittedText:
          'Thank you. Your request has been received and we’ll contact you shortly.',
        strongMatch: 'Strong Match',
        goodMatch: 'Good Match',
        weakMatch: 'Weak Match',
        grantNoRepayment: 'Grant (No repayment)',
        loanRepayment: 'Loan (Repayment required)',
        equityInvestment: 'Equity / Investment',
        rebate: 'Rebate',
        taxCredit: 'Tax Credit',

        stackingDisclaimer:
  '⚠️ Funding combinations may vary by program rules. Please verify eligibility and compatibility directly with the funding provider.',

suggestedFundingMix: '💡 Suggested Funding Mix',
suggestedFundingMixText:
  'These programs may complement different business needs, depending on program rules.',

fundingMixHiring: 'Hiring Support',
fundingMixEquipment: 'Equipment / Investment',
fundingMixInnovation: 'Innovation / R&D',
fundingMixGrowth: 'Growth / Expansion',

statusOpen: 'Open',
statusRolling: 'Rolling',
statusUpcoming: 'Upcoming',
excellentMatch: 'Excellent Match',

statusConfidence: 'Status Confidence',
lastVerified: 'Last Verified',
verifiedStatus: 'Verified',
reviewPendingStatus: 'Needs Review',
unconfirmedStatus: 'Unconfirmed',
statusDisclaimer: 'Status reflects the latest stored program data and should be confirmed with the provider before applying.',
      },

      admin: {
        loadingTitle: 'Loading admin insights...',
        loadingText:
          'Please wait while we collect leads, matches, requests, and grant activity.',
        errorTitle: 'Something went wrong',
        heroBadge: 'Admin Dashboard',
        heroTitle: 'Leads, Requests & Match Tables',
        heroText:
          'Manage free leads, full report requests, recommendation data, and grant imports in one responsive dashboard.',
        refreshing: 'Refreshing admin data...',
        totalProfiles: 'Total Profiles',
        totalProfilesSub: 'Saved business profiles created from the quiz.',
        totalLeads: 'Total Leads',
        totalLeadsSub: 'Captured contact records before results were shown.',
        reportRequests: 'Report Requests',
        reportRequestsSub: 'Users who requested the full report.',
        totalSavedMatches: 'Total Saved Matches',
        totalSavedMatchesSub: 'Recommendation rows stored in match history.',
        averageScore: 'Average Score',
        averageScoreSub: 'Average recommendation score across all saved matches.',
        mostMatchedGrant: 'Most Matched Grant',
        matchedTimes: 'Matched {{count}} time(s)',
        fullReportRequests: 'Full Report Requests',
        fullReportRequestsSub:
          'Review users who requested premium access and export the request list.',
        leadsTable: 'Leads Table',
        leadsTableSub:
          'Filter and export lead records by date range or search text.',
        matchesTable: 'Matches Table',
        matchesTableSub:
          'Track matched grants in a row-based format and export filtered match records.',
        showingRequests: 'Showing {{filtered}} of {{total}} request(s)',
        showingLeads: 'Showing {{filtered}} of {{total}} lead(s)',
        showingMatches: 'Showing {{filtered}} of {{total}} match(es)',
        downloadCsv: 'Download CSV',
        clearFilters: 'Clear Filters',
        searchRequests: 'Search report requests...',
        searchLeads: 'Search leads...',
        searchMatches: 'Search matches...',
        noRequests: 'No report requests found for the current filters.',
        noLeads: 'No leads found for the current filters.',
        noMatches: 'No matches found for the current filters.',
        date: 'Date',
        businessName: 'Business Name',
        email: 'Email',
        phone: 'Phone',
        status: 'Status',
        industry: 'Industry',
        stage: 'Stage',
        goal: 'Goal',
        notes: 'Notes',
        profileId: 'Profile ID',
        report: 'Report',
        premium: 'Premium',
        contactName: 'Contact Name',
        grantName: 'Grant Name',
        organization: 'Organization',
        score: 'Score',
        reasons: 'Reasons',
        grantId: 'Grant ID',
        downloadPdf: 'Download PDF',
        unlockPremium: 'Unlock Premium',
        unlocking: 'Unlocking...',
        viewResults: 'View Results',
        openDraftGenerator: 'Open Draft Generator',
      },
    },
  },

  fr: {
    translation: {
      common: {
        brand: 'GrantMatch NB',
        language: 'Langue',
        english: 'English',
        french: 'Français',
        backHome: 'Retour à l’accueil',
        runNewQuiz: 'Lancer un nouveau quiz',
        reviewImportedGrants: 'Vérifier les subventions importées',
        close: 'Fermer',
        cancel: 'Annuler',
        submit: 'Soumettre',
        loading: 'Chargement...',
        saving: 'Enregistrement...',
        yes: 'Oui',
        no: 'Non',
        unknown: 'Inconnu',
        notSpecified: 'Non précisé',
        organizationNotSpecified: 'Organisation non précisée',
        unnamedProgram: 'Programme sans nom',
      },

      home: {
        navButton: 'Trouver mes subventions',
        pill: 'Conçu pour les entreprises du Nouveau-Brunswick • Bilingue EN/FR',
        heroTitle1: 'Ne laissez plus de financement du N.-B.',
        heroTitle2: 'vous échapper.',
        heroText:
          'Subventions, prêts et crédits d’impôt gouvernementaux — adaptés à votre entreprise du N.-B. en quelques minutes. En anglais ou en français.',
        heroButton: 'Trouver mes subventions — Gratuit →',
        subText: 'Aucune carte requise • Environ 5 minutes',
        stats1Label: 'programmes de financement du N.-B. suivis',
        stats2Label: 'valeur moyenne des meilleures correspondances',
        stats3Label: 'pour voir vos résultats',
        howItWorks: 'Comment ça marche',
        step1Title: 'Répondez à 6 questions',
        step1Body:
          'Parlez-nous de votre entreprise — secteur, stade, objectifs et préférence de financement.',
        step2Title: 'L’IA trouve vos correspondances',
        step2Body:
          'Nous analysons les programmes de financement du Nouveau-Brunswick et classons ceux qui correspondent le mieux à votre profil.',
        step3Title: 'Postulez avec confiance',
        step3Body:
          'Voyez pourquoi vous correspondez, quels financements peuvent être disponibles et où postuler ensuite.',
        footer:
          'Conçu à Fredericton, Nouveau-Brunswick • Pour toutes les entreprises du N.-B., en anglais et en français',
      },

      quiz: {
        badge: 'Quiz de correspondance au financement du N.-B.',
        questionCounter: 'Question {{current}} sur {{total}}',
        progressComplete: '{{value}}% terminé',
        savingAnswers:
          'Enregistrement de vos réponses et préparation de vos résultats personnalisés...',
        back: '← Retour à la question précédente',
        stepIndicator: 'Étape {{current}} / {{total}}',
        saveError: 'Impossible d’enregistrer votre profil. Veuillez réessayer.',
        unexpectedError:
          'Une erreur est survenue lors de l’enregistrement de vos réponses.',

        industry_question: 'Dans quel secteur se trouve votre entreprise ?',
        industry_subtitle: 'Choisissez l’option la plus proche',

        stage_question: 'À quel stade se trouve votre entreprise ?',
        stage_subtitle: 'Cela nous aide à trouver les bons programmes',

        employees_question: 'Combien d’employés avez-vous ?',
        employees_subtitle: 'En vous incluant',

        does_rd_question:
          'Faites-vous de la recherche ou de l’innovation ?',
        does_rd_subtitle:
          'Cela comprend les nouveaux produits, la technologie ou l’innovation des procédés',

        goal_question:
          'Quel est votre principal objectif de financement en ce moment ?',
        goal_subtitle: 'Choisissez l’option la plus importante',

        funding_preference_question:
          'Quel type de financement préférez-vous ?',
        funding_preference_subtitle:
          'Cela aide à mieux prioriser les correspondances',

        industry_opt_1: 'Technologie / Logiciel',
        industry_opt_2: 'Énergie propre / Cleantech',
        industry_opt_3: 'Fabrication',
        industry_opt_4: 'Agriculture / Alimentation',
        industry_opt_5: 'Santé et sciences de la vie',
        industry_opt_6: 'Commerce de détail / Hôtellerie',
        industry_opt_7: 'Services professionnels',
        industry_opt_8: 'Construction',
        industry_opt_9: 'Médias / Créatif',
        industry_opt_11: 'Arts, culture et industries créatives',
        industry_opt_10: 'Autre',

        stage_opt_1: 'Idée / Prérevenu',
        stage_opt_2: 'Démarrage',
        stage_opt_3: 'Croissance',
        stage_opt_4: 'Établie',

        employees_opt_1: 'Moi seulement (1)',
        employees_opt_2: '2 à 4 employés',
        employees_opt_3: '5 à 15 employés',
        employees_opt_4: '16 à 50 employés',
        employees_opt_5: '50+ employés',

        does_rd_opt_1: 'Oui — fort accent sur la R-D / l’innovation',
        does_rd_opt_2: 'Un peu — innovation occasionnelle',
        does_rd_opt_3: 'Non — surtout opérations ou services',

        goal_opt_1: 'Embauche de personnel',
        goal_opt_2: 'Développement de produit / innovation',
        goal_opt_3: 'R-D / commercialisation',
        goal_opt_4: 'Exportation / nouveaux marchés',
        goal_opt_5: 'Équipement / investissement en capital',
        goal_opt_6: 'Adoption numérique / automatisation',
        goal_opt_7: 'Formation des employés',
        goal_opt_8: 'Durabilité / efficacité énergétique',
        goal_opt_9: 'Croissance générale de l’entreprise',

        funding_preference_opt_1: 'Subventions seulement (non remboursables)',
        funding_preference_opt_2: 'Préférence pour les subventions, ouvert aux prêts',
        funding_preference_opt_3: 'Ouvert aux subventions et aux prêts',

        business_location_question: "Où se situe votre entreprise ?",
business_location_subtitle: "Cela aide à identifier les programmes régionaux",
business_location_opt_1: 'Fredericton',
business_location_opt_2: 'Moncton',
business_location_opt_3: 'Saint John',
business_location_opt_4: 'Autre région du Nouveau-Brunswick',
business_location_opt_5: 'À l’extérieur du Nouveau-Brunswick',

expansion_investment_question: "Prévoyez-vous une expansion ou un investissement en équipement ?",
expansion_investment_subtitle: "Cela aide à identifier les programmes de capital et de développement",
expansion_investment_opt_1: 'Oui',
expansion_investment_opt_2: 'Non',
expansion_investment_opt_3: 'Pas certain',

funding_need_type_question: 'Quel type de financement recherchez-vous surtout ?',
funding_need_type_subtitle: 'Nous prioriserons les opportunités les plus pertinentes',
funding_need_type_opt_1: 'Subvention',
funding_need_type_opt_2: 'Prêt',
funding_need_type_opt_3: 'Investissement',
funding_need_type_opt_4: "Crédit d'impôt",
funding_need_type_opt_5: 'Pas certain',

innovation_depth_question: 'Votre entreprise développe-t-elle une nouvelle technologie ou des produits innovants ?',
innovation_depth_subtitle: "Important pour les programmes axés sur l'innovation",
innovation_depth_opt_1: 'Oui - activité principale',
innovation_depth_opt_2: 'Un peu d’innovation',
innovation_depth_opt_3: 'Non',

ownership_type_question: "Comment décririez-vous la propriété de l'entreprise ?",
ownership_type_subtitle: 'Certains programmes sont conçus pour des groupes de fondateurs précis',
ownership_type_opt_1: 'Dirigée par des femmes',
ownership_type_opt_2: 'Dirigée par des Autochtones',
ownership_type_opt_3: 'Dirigée par des jeunes',
ownership_type_opt_4: 'Générale',
      },

      results: {
        loadingTitle: 'Recherche de vos meilleures correspondances...',
        loadingText:
          'Nous analysons les programmes de financement du Nouveau-Brunswick selon vos réponses.',
        errorTitle: 'Une erreur est survenue',
        resultsReady: '✓ Résultats prêts',
        heroTitle: 'Vos correspondances de financement du Nouveau-Brunswick',
        heroText:
          'Nous avons sélectionné les meilleures possibilités de financement pour votre entreprise selon votre profil et vos critères.',
        heroNotice:
          'Nous avons évalué {{count}} programmes de financement du Nouveau-Brunswick. Votre aperçu gratuit montre {{visible}} correspondance{{suffix}}. Votre rapport premium comprend toutes les meilleures possibilités trouvées pour votre entreprise.',
        yourProfile: 'Votre profil',
        yourProfileSubtitle:
          'Ces informations ont été utilisées pour calculer vos correspondances personnalisées.',
        personalizedMatchProfile: 'Profil de correspondance personnalisé',
        industry: 'Secteur',
        stage: 'Stade',
        employees: 'Employés',
        doesRd: 'Fait de la R-D',
        goal: 'Objectif',
        recommendedFundingStack: 'Combinaison de financement recommandée',
        recommendedFundingStackSubtitle:
          'Une combinaison suggérée de programmes pouvant bien fonctionner ensemble.',
        smartCombination: 'Combinaison intelligente',
        estimatedCombinedFunding: 'Financement combiné estimé',
        notFullySpecified: 'Non entièrement précisé',
        whyThisStackMayWork: 'Pourquoi cette combinaison peut fonctionner',
        deadlineAlerts: 'Alertes d’échéance',
        deadlineAlertsSubtitle:
          'Recevez une notification lorsque les subventions correspondantes approchent de leur date limite.',
        retentionFeature: 'Fonction de rétention',
        emailAddress: 'Adresse courriel',
        days3: '3 jours avant',
        days7: '7 jours avant',
        days14: '14 jours avant',
        enableDeadlineAlerts: 'Activer les alertes d’échéance',
        deadlineAlertsEnabled:
          'Les alertes d’échéance ont été activées avec succès.',
        noPrograms:
          'Aucun programme de financement actif du Nouveau-Brunswick n’est disponible pour le moment.',
        topMatch: 'MEILLEURE CORRESPONDANCE',
        maximumAmount: 'Montant maximal',
        fundingType: 'Type de financement',
        status: 'Statut',
        eligibility: 'Admissibilité',
        whyThisMatches: 'Pourquoi cela correspond',
        viewGrantDetails: 'Voir les détails de la subvention →',
        premiumReport: 'Rapport premium',
        unlockTitle: 'Débloquez votre rapport complet de financement',
        unlockText:
          'Nous avons trouvé {{count}} programme{{suffix}} pertinent{{suffix}} pour votre entreprise. Votre aperçu gratuit en montre {{visible}}. Demandez le rapport complet pour débloquer les {{remaining}} autres.',
        payFeature1:
          '✓ Accédez à votre rapport premium complet avec toutes les meilleures possibilités trouvées pour votre entreprise',
        payFeature2: '✓ Voyez les montants de financement pour chaque possibilité',
        payFeature3:
          '✓ Clarté sur le type de financement — Subvention (sans remboursement) ou prêt (remboursement requis)',
        payFeature4:
          '✓ Détail complet de l’admissibilité adapté à votre entreprise',
        payFeature5:
          '✓ Brouillon professionnel de demande pour démarrer votre soumission (prêt à personnaliser)',
        payFeature6:
          '✓ Téléchargez les brouillons de demande en Word ou PDF',
        payFeature7: '✓ Générez les brouillons en anglais ou en français',
        payFeature8:
          '✓ Classement prioritaire — sachez où postuler d’abord',
        payFeature9: '✓ Gagnez des heures de recherche manuelle',
        paywallTrust:
          'Conçu pour les entreprises du Nouveau-Brunswick • Sans abonnement • Demandez l’accès maintenant',
        premiumAccess: 'Accès premium',
        requestFullReport: 'Demander le rapport complet',
        nextSteps: 'Nous vous contacterons avec les prochaines étapes',
        requestFullReportButton: 'Demander le rapport complet →',
        moreOpportunities:
          'Votre rapport premium comprend plus de possibilités',
        moreOpportunitiesText:
          'Votre aperçu gratuit montre {{visible}} correspondance{{suffix}}. Passez à la version complète pour débloquer les {{remaining}} autre{{opSuffix}} possibilité{{suffix}} sélectionnée{{suffix}} pour votre entreprise.',
        draftGenerator: 'Générateur de brouillon de demande',
        draftGeneratorSubtitle:
          'Générez un brouillon professionnel basé sur votre profil et vos possibilités correspondantes.',
        draftLanguage: 'Langue du brouillon',
        generateDraft: 'Générer le brouillon',
        applicationDraft: 'Brouillon de demande',
        draftIntro:
          'Ce brouillon est basé sur le profil de votre entreprise et l’opportunité de financement sélectionnée. Relisez-le et ajustez-le avant de le soumettre.',
        generatingDraft: 'Génération de votre brouillon...',
        executiveSummary: 'Résumé exécutif',
        businessOverview: 'Présentation de l’entreprise',
        projectAlignment: 'Alignement du projet',
        useOfFunds: 'Utilisation des fonds',
        expectedImpact: 'Impact attendu',
        closingStatement: 'Conclusion',
        copyDraft: 'Copier le brouillon',
        downloadWord: 'Télécharger Word',
        downloadPdf: 'Télécharger PDF',
        premiumFeature: 'Fonction premium',
        requestModalTitle: 'Demander le rapport complet',
        requestModalText:
          'Soumettez vos coordonnées et nous vous contacterons au sujet du rapport complet de financement.',
        businessName: 'Nom de l’entreprise',
        emailAddressCapital: 'Adresse courriel',
        phoneNumber: 'Numéro de téléphone',
        optionalNotes: 'Notes facultatives',
        submitting: 'Envoi...',
        submitRequest: 'Soumettre la demande',
        requestSubmitted: 'Demande envoyée',
        requestSubmittedText:
          'Merci. Votre demande a bien été reçue et nous vous contacterons sous peu.',
        strongMatch: 'Correspondance forte',
        goodMatch: 'Bonne correspondance',
        weakMatch: 'Correspondance faible',
        grantNoRepayment: 'Subvention (sans remboursement)',
        loanRepayment: 'Prêt (remboursement requis)',
        equityInvestment: 'Capitaux propres / Investissement',
        rebate: 'Remise',
        taxCredit: 'Crédit d’impôt',

        stackingDisclaimer:
  '⚠️ Les combinaisons de financement peuvent varier selon les règles du programme. Veuillez vérifier l’admissibilité auprès du fournisseur.',

suggestedFundingMix: '💡 Combinaison de financement suggérée',
suggestedFundingMixText:
  'Ces programmes peuvent compléter différents besoins selon les règles.',

fundingMixHiring: "Soutien à l'embauche",
fundingMixEquipment: 'Équipement / Investissement',
fundingMixInnovation: 'Innovation / R-D',
fundingMixGrowth: 'Croissance / Expansion',

statusOpen: 'Ouvert',
statusRolling: 'En continu',
statusUpcoming: 'À venir',
excellentMatch: 'Correspondance excellente',

statusConfidence: 'Fiabilité du statut',
lastVerified: 'Dernière vérification',
verifiedStatus: 'Vérifié',
reviewPendingStatus: 'À vérifier',
unconfirmedStatus: 'Non confirmé',
statusDisclaimer: "Le statut reflète les dernières données enregistrées du programme et doit être confirmé auprès de l'organisme avant de postuler.",
      },

      admin: {
        loadingTitle: 'Chargement des informations administratives...',
        loadingText:
          'Veuillez patienter pendant que nous collectons les prospects, correspondances, demandes et activités de subventions.',
        errorTitle: 'Une erreur est survenue',
        heroBadge: 'Tableau de bord administrateur',
        heroTitle: 'Prospects, demandes et tableaux de correspondances',
        heroText:
          'Gérez les prospects gratuits, les demandes de rapport complet, les données de recommandation et les importations de subventions dans un seul tableau de bord réactif.',
        refreshing: 'Actualisation des données administratives...',
        totalProfiles: 'Profils totaux',
        totalProfilesSub:
          'Profils d’entreprise enregistrés à partir du quiz.',
        totalLeads: 'Prospects totaux',
        totalLeadsSub:
          'Coordonnées capturées avant l’affichage des résultats.',
        reportRequests: 'Demandes de rapport',
        reportRequestsSub:
          'Utilisateurs ayant demandé le rapport complet.',
        totalSavedMatches: 'Correspondances enregistrées',
        totalSavedMatchesSub:
          'Lignes de recommandation enregistrées dans l’historique.',
        averageScore: 'Score moyen',
        averageScoreSub:
          'Score moyen des recommandations parmi toutes les correspondances enregistrées.',
        mostMatchedGrant: 'Subvention la plus associée',
        matchedTimes: 'Associée {{count}} fois',
        fullReportRequests: 'Demandes de rapport complet',
        fullReportRequestsSub:
          'Examinez les utilisateurs qui ont demandé l’accès premium et exportez la liste.',
        leadsTable: 'Tableau des prospects',
        leadsTableSub:
          'Filtrez et exportez les prospects par plage de dates ou texte.',
        matchesTable: 'Tableau des correspondances',
        matchesTableSub:
          'Suivez les subventions correspondantes ligne par ligne et exportez les résultats filtrés.',
        showingRequests: 'Affichage de {{filtered}} sur {{total}} demande(s)',
        showingLeads: 'Affichage de {{filtered}} sur {{total}} prospect(s)',
        showingMatches: 'Affichage de {{filtered}} sur {{total}} correspondance(s)',
        downloadCsv: 'Télécharger CSV',
        clearFilters: 'Effacer les filtres',
        searchRequests: 'Rechercher des demandes...',
        searchLeads: 'Rechercher des prospects...',
        searchMatches: 'Rechercher des correspondances...',
        noRequests:
          'Aucune demande de rapport trouvée pour les filtres actuels.',
        noLeads: 'Aucun prospect trouvé pour les filtres actuels.',
        noMatches:
          'Aucune correspondance trouvée pour les filtres actuels.',
        date: 'Date',
        businessName: 'Nom de l’entreprise',
        email: 'Courriel',
        phone: 'Téléphone',
        status: 'Statut',
        industry: 'Secteur',
        stage: 'Stade',
        goal: 'Objectif',
        notes: 'Notes',
        profileId: 'ID du profil',
        report: 'Rapport',
        premium: 'Premium',
        contactName: 'Nom du contact',
        grantName: 'Nom de la subvention',
        organization: 'Organisation',
        score: 'Score',
        reasons: 'Raisons',
        grantId: 'ID de la subvention',
        downloadPdf: 'Télécharger PDF',
        unlockPremium: 'Débloquer Premium',
        unlocking: 'Déblocage...',
        viewResults: 'Voir les résultats',
        openDraftGenerator: 'Ouvrir le générateur',
      },
    },
  },
}

if (!i18n.isInitialized) {
  const savedLanguage =
    typeof window !== 'undefined'
      ? localStorage.getItem('app_language') || 'en'
      : 'en'

  i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })
}

export default i18n