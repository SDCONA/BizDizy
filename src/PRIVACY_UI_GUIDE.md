# Privacy Settings UI Guide

## 📱 Business Registration Form

### Phone Field with Privacy Toggle
```
┌─────────────────────────────────────────────┐
│ Phone *                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ (123) 456-7890                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 👁️ Visible on business page    [✓ ON]  │ │ ← Green eye, toggle ON
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

OR when hidden:

┌─────────────────────────────────────────────┐
│ Phone *                                     │
│ ┌─────────────────────────────────────────┐ │
│ │ (123) 456-7890                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 👁️‍🗨️ Hidden on business page    [  OFF]  │ │ ← Gray eye-off, toggle OFF
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Email Field with Privacy Toggle
```
┌─────────────────────────────────────────────┐
│ Email                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ contact@business.com                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 👁️ Visible on business page    [✓ ON]  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## 🏢 Business Profile Page

### Owner View (Contact Hidden from Public)
```
┌───────────────────────────────────────────────────────┐
│ Contact Information                                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  📞  Phone                    [👁️‍🗨️ Hidden]      │ │ ← Yellow badge
│  │      (123) 456-7890                              │ │
│  └──────────────────────────────────────────────────┘ │
│  ℹ️ Visible only for you                              │ ← Info text
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ✉️  Email                                        │ │ ← No badge (visible)
│  │      contact@business.com                        │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Public View (Contact Hidden)
```
┌───────────────────────────────────────────────────────┐
│ Contact Information                                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ✉️  Email                                        │ │ ← Only shows email
│  │      Click to show                               │ │    (phone is hidden)
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  🌐  Website                                      │ │
│  │      www.business.com                            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Public View (All Visible)
```
┌───────────────────────────────────────────────────────┐
│ Contact Information                                   │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  📞  Phone                                        │ │
│  │      Click to show                               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ✉️  Email                                        │ │
│  │      Click to show                               │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
└───────────────────────────────────────────────────────┘
```

## 🎨 Color Scheme

### Toggle Switch States
- **ON (Visible)**: 
  - Eye icon: 🟢 Green (`text-green-600`)
  - Background: Light gray (`bg-gray-50`)
  - Border: Gray (`border-gray-200`)
  - Text: "Visible on business page"

- **OFF (Hidden)**:
  - Eye-off icon: ⚫ Gray (`text-gray-400`)
  - Background: Light gray (`bg-gray-50`)
  - Border: Gray (`border-gray-200`)
  - Text: "Hidden on business page"

### Hidden Badge (Owner View)
- Background: Yellow (`bg-yellow-100`)
- Text: Dark yellow (`text-yellow-700`)
- Icon: Eye-off (`EyeOff`)
- Size: Small (`text-xs`)
- Padding: Compact (`px-2 py-1`)

## 💡 UX Features

### Smart Defaults
- ✅ New businesses: Both phone and email visible by default
- ✅ Edited businesses: Preserve existing privacy settings
- ✅ Migrated businesses: Default to visible (backwards compatible)

### Owner Privileges
- ✅ Owners always see their own contact info
- ✅ "Hidden" badge reminds them what public sees
- ✅ Can toggle settings in edit mode anytime

### Public Experience
- ✅ Hidden fields simply don't appear
- ✅ No indication that fields are hidden
- ✅ Can use messaging system as alternative
- ✅ "Click to show" reveals visible contacts

## 📱 Responsive Design

### Mobile (< 768px)
```
┌────────────────────────┐
│ Phone *                │
│ ┌────────────────────┐ │
│ │ (123) 456-7890     │ │
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │ 👁️ Visible  [✓ ON] │ │
│ └────────────────────┘ │
└────────────────────────┘
```

### Desktop (> 768px)
```
┌──────────────────────────┬──────────────────────────┐
│ Phone *                  │ Email                    │
│ ┌──────────────────────┐ │ ┌──────────────────────┐ │
│ │ (123) 456-7890       │ │ │ contact@business.com │ │
│ └──────────────────────┘ │ └──────────────────────┘ │
│ ┌──────────────────────┐ │ ┌──────────────────────┐ │
│ │ 👁️ Visible    [✓ ON] │ │ │ 👁️ Visible    [✓ ON] │ │
│ └──────────────────────┘ │ └──────────────────────┘ │
└──────────────────────────┴──────────────────────────┘
```

---

**Design Philosophy**: Simple, clear, non-intrusive privacy controls that give business owners control without overwhelming users.
