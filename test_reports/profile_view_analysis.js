#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the ProfileView component
const profileViewPath = path.join(__dirname, '../src/components/ProfileView.tsx');
const profileViewContent = fs.readFileSync(profileViewPath, 'utf8');

// Read theme file
const themePath = path.join(__dirname, '../src/lib/theme.ts');
const themeContent = fs.readFileSync(themePath, 'utf8');

// Read constants file
const constantsPath = path.join(__dirname, '../src/lib/constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

console.log('🔍 ProfileView Component Analysis\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Check if ProfileView imports getLevelFromXP from constants
const hasGetLevelImport = profileViewContent.includes('import { getLevelFromXP') && 
                         profileViewContent.includes('from \'@/lib/constants\'');
if (hasGetLevelImport) {
  results.passed.push('✅ ProfileView imports getLevelFromXP from constants');
} else {
  results.failed.push('❌ ProfileView does not import getLevelFromXP from constants');
}

// Test 2: Check if XP gradient uses T.teal and T.coral
const xpGradientMatch = profileViewContent.match(/colors=\{.*?\[T\.teal,\s*T\.coral\].*?\}/s);
if (xpGradientMatch) {
  results.passed.push('✅ XP gradient uses T.teal and T.coral brand colors');
} else {
  results.failed.push('❌ XP gradient does not use T.teal and T.coral brand colors');
}

// Test 3: Check avatar has T.teal border
const avatarRingMatch = profileViewContent.match(/avatarRing:.*?borderColor:\s*T\.teal/s);
if (avatarRingMatch) {
  results.passed.push('✅ Avatar has brand-colored ring (T.teal border)');
} else {
  results.failed.push('❌ Avatar does not have T.teal border');
}

// Test 4: Check avatar size is 84px
const avatarSizeMatch = profileViewContent.match(/avatar:.*?height:\s*84.*?width:\s*84/s);
if (avatarSizeMatch) {
  results.passed.push('✅ Avatar is 84px (larger size)');
} else {
  results.failed.push('❌ Avatar is not 84px size');
}

// Test 5: Check for stats row with dividers
const statDividerMatches = (profileViewContent.match(/statDivider/g) || []).length;
if (statDividerMatches >= 3) { // Should have 2 dividers in stats row + style definition
  results.passed.push('✅ Stats row has dividers between catch/follower/following counts');
} else {
  results.failed.push('❌ Stats row missing proper dividers');
}

// Test 6: Check level badge is inline with username
const nameRowMatch = profileViewContent.match(/nameRow:.*?flexDirection:\s*['"]row['"].*?alignItems:\s*['"]center['"]/s);
const levelBadgeInNameRow = profileViewContent.includes('<View style={styles.nameRow}>') && 
                           profileViewContent.includes('<Text style={styles.username}>') &&
                           profileViewContent.includes('<View style={[styles.levelBadge');
if (nameRowMatch && levelBadgeInNameRow) {
  results.passed.push('✅ Level badge shows inline next to username');
} else {
  results.failed.push('❌ Level badge is not properly inline with username');
}

// Test 7: Check action buttons have minHeight 44px
const minHeight44Matches = (profileViewContent.match(/minHeight:\s*44/g) || []).length;
if (minHeight44Matches >= 4) { // Should have multiple buttons with 44px minHeight
  results.passed.push('✅ Action buttons have minHeight 44px for touch accessibility');
} else {
  results.failed.push('❌ Not all action buttons have minHeight 44px');
}

// Test 8: Check sign out button has 52px minHeight and icon
const signOutButtonMatch = profileViewContent.match(/signOutButton:.*?minHeight:\s*52/s);
const signOutIconMatch = profileViewContent.includes('name="log-out-outline"');
if (signOutButtonMatch && signOutIconMatch) {
  results.passed.push('✅ Sign out button has 52px minHeight and icon');
} else {
  results.failed.push('❌ Sign out button missing 52px minHeight or icon');
}

// Test 9: Check catch tiles use LinearGradient overlay
const catchTileGradientMatch = profileViewContent.includes('<LinearGradient') && 
                              profileViewContent.includes('catchTileGradient') &&
                              profileViewContent.includes('colors={[\'transparent\', \'rgba(5,6,8,0.95)\']');
if (catchTileGradientMatch) {
  results.passed.push('✅ Catch tiles use LinearGradient overlay instead of solid overlay');
} else {
  results.failed.push('❌ Catch tiles do not use proper LinearGradient overlay');
}

// Test 10: Check for hardcoded non-brand colors
const hardcodedColors = profileViewContent.match(/#[0-9A-Fa-f]{6}/g) || [];
const allowedHardcodedColors = ['#FFFFFF']; // White is acceptable for level badge text
const problematicColors = hardcodedColors.filter(color => !allowedHardcodedColors.includes(color));

if (problematicColors.length === 0) {
  results.passed.push('✅ No problematic hardcoded colors found (uses centralized T theme colors)');
} else {
  results.failed.push(`❌ Found hardcoded colors that should use theme: ${problematicColors.join(', ')}`);
}

// Test 11: Check theme colors are properly defined
const tealColorMatch = themeContent.includes('teal: \'#D4FF00\'');
const coralColorMatch = themeContent.includes('coral: \'#FF5500\'');
if (tealColorMatch && coralColorMatch) {
  results.passed.push('✅ Theme colors T.teal and T.coral are properly defined');
} else {
  results.failed.push('❌ Theme colors T.teal and T.coral are not properly defined');
}

// Test 12: Check getLevelFromXP function exists in constants
const getLevelFunctionMatch = constantsContent.includes('export const getLevelFromXP');
if (getLevelFunctionMatch) {
  results.passed.push('✅ getLevelFromXP function exists in constants');
} else {
  results.failed.push('❌ getLevelFromXP function missing from constants');
}

// Print results
console.log('📊 Test Results:\n');

console.log('🟢 PASSED TESTS:');
results.passed.forEach(test => console.log(`  ${test}`));

if (results.failed.length > 0) {
  console.log('\n🔴 FAILED TESTS:');
  results.failed.forEach(test => console.log(`  ${test}`));
}

if (results.warnings.length > 0) {
  console.log('\n🟡 WARNINGS:');
  results.warnings.forEach(warning => console.log(`  ${warning}`));
}

console.log(`\n📈 Summary: ${results.passed.length} passed, ${results.failed.length} failed, ${results.warnings.length} warnings`);

// Exit with appropriate code
process.exit(results.failed.length > 0 ? 1 : 0);