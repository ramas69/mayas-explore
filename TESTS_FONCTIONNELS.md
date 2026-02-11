# 🧪 Tests Fonctionnels - Maya Explorer

## 📋 Guide de Test Complet par Rôle

---

## 🎓 RÔLE : ÉLÈVE (Student)

### 1. Authentification & Profil
- [ ] **Connexion** avec email/mot de passe
- [ ] **Déconnexion** depuis le header
- [ ] **Voir son profil** (nom, classe, XP, niveau)
- [ ] **Consulter ses statistiques** (temps d'utilisation, progression)

### 2. Carte des Matières (Jungle Map)
- [ ] **Visualiser la carte** avec toutes les matières
- [ ] **Voir les statuts** des matières (danger, surveiller, reviser, ok)
- [ ] **Cliquer sur une matière** pour ouvrir la modale
- [ ] **Voir les chapitres** d'une matière dans la modale
- [ ] **Démarrer une conversation** depuis un chapitre
- [ ] **Accéder au Grimoire** (historique) d'une matière

### 3. Sélection de Gardien (Guardian Picker)
- [ ] **Voir tous les gardiens** disponibles
- [ ] **Lire les descriptions** de chaque gardien
- [ ] **Sélectionner un gardien** pour démarrer une conversation
- [ ] **Voir le gardien approprié** selon la matière choisie

### 4. Chat avec l'IA
- [ ] **Envoyer un message texte**
- [ ] **Recevoir une réponse** de l'IA
- [ ] **Voir l'indicateur "typing..."** pendant que l'IA répond
- [ ] **Upload d'image** (photo de devoir, schéma)
- [ ] **Recevoir des images** (schémas, diagrammes) de l'IA
- [ ] **Voir les messages** avec formatage Markdown (gras, listes, etc.)
- [ ] **Autoscroll** vers le dernier message
- [ ] **Redirection vers un autre gardien** si question hors-sujet
- [ ] **Limite de temps journalière** respectée (message si dépassée)

### 5. Grimoire (Sandbox Excalidraw)
- [ ] **Voir les images** envoyées par l'IA
- [ ] **Dessiner** sur le canvas
- [ ] **Ajouter du texte** et des annotations
- [ ] **Utiliser les outils** Excalidraw (formes, flèches, etc.)
- [ ] **Sauvegarder automatiquement** les modifications
- [ ] **Charger l'état précédent** en revenant sur une session
- [ ] **Voir les dessins IA** (Maths) s'afficher automatiquement

### 6. Programme Scolaire
- [ ] **Voir son programme** par matière
- [ ] **Consulter les chapitres** et leur statut
- [ ] **Voir la progression** (pas vu, vu en classe, maîtrisé)
- [ ] **Filtrer par matière**

### 7. Planning de Révision
- [ ] **Voir son emploi du temps** uploadé
- [ ] **Consulter les créneaux** de révision suggérés
- [ ] **Voir les vacances scolaires** de sa zone
- [ ] **Voir les prochaines vacances** mises en avant

### 8. Récompenses & Gamification
- [ ] **Gagner des XP** après avoir complété un exercice
- [ ] **Voir la modale de victoire** avec animation
- [ ] **Débloquer des artefacts** (trophées)
- [ ] **Consulter ses artefacts** dans le profil
- [ ] **Voir son niveau** progresser

### 9. Grimoire Modal (Historique)
- [ ] **Ouvrir l'historique** d'une matière
- [ ] **Voir toutes les sessions** passées
- [ ] **Cliquer sur une session** pour la rouvrir
- [ ] **Voir le titre** et la date de chaque session
- [ ] **Reprendre une conversation** là où elle s'était arrêtée

### 10. Navigation & UI
- [ ] **Menu hamburger** (mobile) fonctionne
- [ ] **Sidebar** (desktop) fonctionne
- [ ] **Bottom navigation** (mobile) fonctionne
- [ ] **Basculer entre les onglets** (Carte, Chat, Programme, Planning, Profil)
- [ ] **Animations** et effets de particules visibles
- [ ] **Responsive** sur mobile, tablette, desktop

---

## 👨‍👩‍👧 RÔLE : PARENT

### 1. Authentification & Accès
- [ ] **Connexion** avec email/mot de passe
- [ ] **Déconnexion**
- [ ] **Voir la liste** de ses enfants

### 2. Dashboard Parent
- [ ] **Voir les statistiques** de chaque enfant
- [ ] **Consulter le temps d'utilisation** journalier/hebdomadaire
- [ ] **Voir la progression** par matière
- [ ] **Accéder au profil** de chaque enfant

### 3. Gestion du Profil Enfant
- [ ] **Modifier le nom** de l'enfant
- [ ] **Changer la classe** (6ème, 5ème, 4ème, 3ème)
- [ ] **Définir la limite de temps** journalière
- [ ] **Sauvegarder les modifications**

### 4. Upload de Bulletin
- [ ] **Uploader un bulletin** (PDF ou image)
- [ ] **Voir la prévisualisation** du bulletin uploadé
- [ ] **Lancer l'analyse IA** du bulletin
- [ ] **Voir les résultats** de l'analyse (matières, notes, statuts)
- [ ] **Consulter les recommandations** de l'IA
- [ ] **Voir l'historique** des bulletins uploadés
- [ ] **Supprimer un bulletin**

### 5. Upload d'Emploi du Temps
- [ ] **Uploader un emploi du temps** (PDF ou image)
- [ ] **Voir la prévisualisation** de l'emploi du temps
- [ ] **Lancer l'analyse IA** de l'emploi du temps
- [ ] **Voir les créneaux** extraits automatiquement
- [ ] **Modifier les créneaux** manuellement
- [ ] **Voir les créneaux de vacances** séparément
- [ ] **Sauvegarder les modifications**
- [ ] **Supprimer l'emploi du temps**

### 6. Configuration du Planning
- [ ] **Choisir la zone scolaire** (A, B, C)
- [ ] **Voir les vacances** correspondantes
- [ ] **Modifier les créneaux** de révision
- [ ] **Ajouter des créneaux** personnalisés
- [ ] **Supprimer des créneaux**
- [ ] **Voir le planning** hebdomadaire

### 7. Notes Prioritaires
- [ ] **Ajouter une note** pour l'enfant
- [ ] **Définir une priorité** (matière à travailler)
- [ ] **Voir les notes** existantes
- [ ] **Modifier une note**
- [ ] **Supprimer une note**
- [ ] **Vérifier que l'IA** utilise ces notes dans ses réponses

### 8. Suivi & Monitoring
- [ ] **Voir l'historique** des sessions de chat
- [ ] **Consulter les conversations** de l'enfant
- [ ] **Voir les chapitres** travaillés
- [ ] **Suivre la progression** par matière
- [ ] **Recevoir des alertes** (limite de temps, etc.)

---

## 🔧 TESTS TECHNIQUES

### 1. Performance
- [ ] **Temps de chargement** < 3 secondes
- [ ] **Pas de lag** lors du scroll
- [ ] **Animations fluides** (60 fps)
- [ ] **Hot reload** fonctionne en dev

### 2. Gestion des Erreurs
- [ ] **Message d'erreur clair** si connexion échoue
- [ ] **Timeout du chat** après 2 minutes
- [ ] **Gestion des erreurs** Supabase (navigatorLock)
- [ ] **Fallback** si l'IA ne répond pas
- [ ] **Validation des formulaires**

### 3. Sécurité & Sessions
- [ ] **Session persistante** après rechargement
- [ ] **Déconnexion automatique** si token expiré
- [ ] **Pas d'accès** aux données d'autres utilisateurs
- [ ] **Upload sécurisé** (validation des fichiers)
- [ ] **RLS Supabase** actif

### 4. Données & Synchronisation
- [ ] **Sauvegarde automatique** des messages
- [ ] **Sauvegarde du canvas** Excalidraw
- [ ] **Chargement des messages** historiques
- [ ] **Mise à jour en temps réel** (si applicable)
- [ ] **Pas de perte de données** après rechargement

### 5. Responsive & Accessibilité
- [ ] **Mobile** (< 768px) : layout adapté
- [ ] **Tablette** (768px - 1024px) : layout adapté
- [ ] **Desktop** (> 1024px) : layout complet
- [ ] **Touch targets** suffisamment grands (44x44px min)
- [ ] **Contraste** suffisant pour la lisibilité

### 6. Edge Cases
- [ ] **Pas de bulletin** : affichage par défaut
- [ ] **Pas de planning** : message approprié
- [ ] **Session démo** : pas d'appel à l'Edge Function
- [ ] **Image invalide** : gestion de l'erreur
- [ ] **Texte très long** : pas de débordement
- [ ] **Connexion lente** : indicateurs de chargement

---

## 🎯 SCÉNARIOS DE TEST COMPLETS

### Scénario 1 : Premier Jour d'un Élève
1. Connexion pour la première fois
2. Découverte de la carte des matières
3. Sélection d'un gardien (ex: SVT)
4. Première conversation avec l'IA
5. Réception d'un schéma dans le Grimoire
6. Annotation du schéma
7. Gain de XP et artefact
8. Déconnexion

### Scénario 2 : Parent Configure son Enfant
1. Connexion parent
2. Upload du bulletin (PDF)
3. Analyse automatique du bulletin
4. Vérification des matières en difficulté
5. Upload de l'emploi du temps
6. Analyse et extraction des créneaux
7. Ajout d'une note prioritaire ("Travailler les Maths")
8. Définition de la limite de temps (60 min/jour)
9. Sauvegarde et vérification

### Scénario 3 : Session de Révision Complète
1. Élève se connecte
2. Voit la matière prioritaire (selon note parent)
3. Ouvre le chat avec le gardien approprié
4. Pose une question
5. Reçoit une réponse + schéma
6. Annote le schéma dans le Grimoire
7. Pose une question de suivi
8. Complète un exercice
9. Gagne des XP
10. Consulte son historique (Grimoire Modal)
11. Reprend une ancienne session

### Scénario 4 : Gestion d'Erreurs
1. Connexion avec mauvais mot de passe → Message d'erreur
2. Upload d'un fichier trop gros → Message d'erreur
3. Envoi d'un message sans connexion → Timeout + message
4. Sélection d'un gardien pendant une session → Redirection
5. Dépassement de la limite de temps → Blocage + message

---

## 📊 CRITÈRES DE SUCCÈS

### Fonctionnalités Critiques (Bloquantes si KO)
- ✅ Authentification fonctionne
- ✅ Chat IA répond correctement
- ✅ Images s'affichent dans le Grimoire
- ✅ Upload de bulletin fonctionne
- ✅ Sauvegarde des données fonctionne

### Fonctionnalités Importantes (À corriger rapidement)
- ⚠️ Autoscroll du chat
- ⚠️ Responsive mobile
- ⚠️ Gestion des erreurs
- ⚠️ Performance (< 3s)

### Fonctionnalités Nice-to-Have (Améliorations futures)
- 💡 Animations avancées
- 💡 Mode hors-ligne
- 💡 Notifications push
- 💡 Export PDF des sessions

---

## 🐛 BUGS CONNUS À VÉRIFIER

1. **Scroll du chat** : Affecte-t-il toute la page ou juste le conteneur ?
2. **NavigatorLock** : Erreurs Supabase résolues avec customLock ?
3. **Timeout du chat** : Fonctionne-t-il après 2 minutes ?
4. **Images superposées** : Anciennes images retirées correctement ?
5. **Session bloquée** : Peut-on toujours cliquer après une erreur ?

---

## 📝 NOTES DE TEST

**Compte de test Élève :**
- Email: rama@hallia.ai
- Classe: 3ème
- Zone: A

**Compte de test Parent :**
- Email: [À définir]
- Enfants: rama@hallia.ai

**Environnement :**
- Dev: http://localhost:5173
- Navigateurs: Chrome, Firefox, Safari
- Appareils: Desktop, Mobile (iPhone/Android)

---

**Date de création :** 2026-02-10
**Dernière mise à jour :** 2026-02-10
**Statut :** 🚧 En cours de validation
