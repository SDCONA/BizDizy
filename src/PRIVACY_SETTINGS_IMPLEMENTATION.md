# Privacy Settings Implementation - Phone & Email Visibility

## Overview
Added privacy toggles for business owners to control whether their phone number and email are visible on their business profile page.

## Features Implemented

### 1. **Database Schema Changes**
- Added `show_phone` (BOOLEAN, default: true) to businesses table
- Added `show_email` (BOOLEAN, default: true) to businesses table
- Migration file created: `/add_privacy_settings.sql`

### 2. **Business Registration Form** (`/components/BusinessRegistration.tsx`)
- Added Eye/EyeOff icons for visual feedback
- Added Switch components from UI library
- Privacy toggles appear below phone and email input fields
- Visual indicators:
  - 🟢 Green eye icon = "Visible on business page"
  - ⚫ Gray eye-off icon = "Hidden on business page"
- Toggle switches next to each indicator
- Default: Both phone and email are visible (checked)

### 3. **Business Profile Display** (`/components/BusinessProfile.tsx`)
- Respects privacy settings when displaying contact info
- Logic: Shows contact if `(isOwner || show_phone)` or `(isOwner || show_email)`
- **Owner View**: Always sees their contact info, even when hidden
  - Yellow "Hidden" badge in the contact card
  - "ℹ️ Visible only for you" text below the contact info
- **Public View**: Only sees contact info if privacy toggle is ON
- Applied to both contact sections:
  - Main contact information card (mobile/tablet view)
  - Sticky sidebar contact card (desktop view)

### 4. **Type Definitions** (`/types/business.ts`)
- Updated Business interface with new fields:
  ```typescript
  show_phone: boolean;
  show_email: boolean;
  ```

### 5. **API Integration** (`/utils/api.ts`)
- No changes needed - API automatically handles new fields via `Partial<Business>`
- `createBusiness()` and `updateBusiness()` will save privacy settings
- Works with existing backend infrastructure

## How It Works

### Registration/Edit Flow:
1. Business owner fills out form
2. Toggles privacy switches for phone/email
3. Form submits with `show_phone` and `show_email` values
4. Database stores privacy preferences

### Profile Display Flow:
1. Profile loads business data
2. Checks `isOwner` status
3. For phone:
   - If owner: Always show (with "Hidden" badge if `show_phone = false`)
   - If public: Only show if `show_phone = true`
4. For email:
   - If owner: Always show (with "Hidden" badge if `show_email = false`)
   - If public: Only show if `show_email = true`

## Database Migration Required

**IMPORTANT**: Run this SQL on your Supabase database:

```sql
-- Add privacy settings columns
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true;

-- Update existing businesses (all visible by default)
UPDATE businesses 
SET show_phone = true, show_email = true 
WHERE show_phone IS NULL OR show_email IS NULL;
```

## User Experience

### For Business Owners:
- ✅ Can toggle phone/email visibility during registration
- ✅ Can change settings when editing business
- ✅ See "Hidden" badge when viewing their own profile
- ✅ Contact info always visible to them (even when hidden from public)

### For Consumers:
- ✅ Only see contact info that business owner made public
- ✅ Seamless experience - hidden fields simply don't appear
- ✅ Can still use messaging system to contact business

## Files Modified

1. `/types/business.ts` - Added privacy fields to Business interface
2. `/components/BusinessRegistration.tsx` - Added toggle switches and state
3. `/components/BusinessProfile.tsx` - Added conditional display logic
4. `/COMPLETE_FRESH_SETUP.sql` - Updated schema for fresh installs
5. `/add_privacy_settings.sql` - Migration for existing databases

## Testing Checklist

- [ ] Run migration SQL on production database
- [ ] Register new business with phone hidden
- [ ] Register new business with email hidden
- [ ] Register new business with both visible
- [ ] Edit existing business and toggle privacy settings
- [ ] View business as owner - should see contact with "Hidden" badge
- [ ] View business as public - should not see hidden contacts
- [ ] Verify existing businesses default to visible (true)

## Deployment Steps

1. **Database Migration**:
   ```bash
   # In Supabase SQL Editor, run:
   # /add_privacy_settings.sql
   ```

2. **Deploy Frontend**:
   ```bash
   git add .
   git commit -m "Add phone/email privacy settings for business profiles"
   git push origin main
   ```

3. **Verify**:
   - Test registration form shows toggles
   - Test profile respects privacy settings
   - Test owner always sees contact info

## Future Enhancements (Optional)

- [ ] Add privacy toggle for business address
- [ ] Add privacy toggle for social media links
- [ ] Add bulk privacy settings (show/hide all contacts)
- [ ] Add privacy analytics (how many people requested contact)
- [ ] Email notification when someone tries to view hidden contact

---

**Status**: ✅ Implementation Complete - Ready for Database Migration & Deployment
