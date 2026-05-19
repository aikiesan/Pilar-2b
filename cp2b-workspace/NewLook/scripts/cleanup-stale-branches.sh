#!/bin/bash
# Script to clean up stale merged branches
# Run this script after verifying all branches are safely merged

echo "🧹 Cleaning up stale merged branches..."
echo ""

# Auto-generated branch names
echo "Deleting auto-generated branches..."
git push origin --delete \
  angry-sutherland \
  awesome-stonebraker \
  clever-mccarthy \
  cool-elbakyan \
  eager-mclaren \
  elastic-pascal \
  epic-sinoussi \
  flamboyant-bhabha \
  funny-herschel \
  gifted-jackson \
  infallible-hofstadter \
  optimistic-mendeleev \
  peaceful-cartwright \
  quizzical-hugle \
  recursing-wescoff \
  sad-sinoussi

echo ""
echo "Deleting old Claude feature branches..."
git push origin --delete \
  claude/add-municipality-data-integration-01GJA8AU4FFyijXp3zJRceTw \
  claude/brazil-simulation-implementation-01Vyykersi4WB2rFNcRDdqFn \
  claude/enable-cloudflare-deployments-01Y6mb3zUbbP7qwctbUsBKNv \
  claude/filter-buttons-dropdown-01A16T6ZPfsdyPrv7Ntv8LRY \
  claude/fix-database-loading-01PSARRK2MedbCny4YNhmRuK \
  claude/fix-frontend-typename-016XLTSpgvdHyjLr1Soc6Cy7 \
  claude/fix-missing-resources-01YUzZ1CQrFK7rKqUwVTPSvZ \
  claude/fix-popup-missing-fields-01AkMmmJZYFTkpqiDsrg311v \
  claude/fix-region-code-normalization-01V3C4TRoXoCdeSaP5CFJYgi \
  claude/fix-rotas-cards-loading-016XLTSpgvdHyjLr1Soc6Cy7 \
  claude/fix-shapefile-borders-012mCMnVJfpACNiCdtUKCbq3 \
  claude/review-project-docs-0182RNWiA32TuC3uu2gsx9RU \
  claude/verify-residues-technologies-01YGHH6Q1WDw4Z1cH5xsy97D

echo ""
echo "✅ Branch cleanup complete!"
echo ""
echo "To verify, run: git branch -r | grep origin | wc -l"
