import { Business } from "../types/business";

export const mockBusinesses: Business[] = [
  {
    id: "1",
    name: "QuickLock Solutions",
    category: "Locksmith",
    description: "Professional locksmith services available 24/7. Specializing in residential, commercial, and automotive lockouts.",
    serviceArea: "Greater Los Angeles Area",
    city: "Los Angeles",
    zipCode: "90001",
    phone: "(555) 123-4567",
    email: "contact@quicklock.com",
    website: "https://quicklock.example.com",
    socialMedia: {
      facebook: "https://facebook.com/quicklock",
      instagram: "https://instagram.com/quicklock",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80",
      "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&q=80",
    ],
    rating: 4.8,
    reviewCount: 127,
    reviews: [
      {
        id: "r1",
        authorName: "Sarah Johnson",
        rating: 5,
        date: "2025-10-05",
        comment: "Excellent service! They arrived within 30 minutes and had my door unlocked in no time. Very professional and reasonably priced."
      },
      {
        id: "r2",
        authorName: "Mike Chen",
        rating: 5,
        date: "2025-09-28",
        comment: "Best locksmith in LA! Fast, reliable, and fair pricing. Highly recommend for anyone locked out."
      },
      {
        id: "r3",
        authorName: "Emily Rodriguez",
        rating: 4,
        date: "2025-09-15",
        comment: "Good service overall. Took a bit longer than expected but they got the job done well."
      }
    ],
    featured: true
  },
  {
    id: "2",
    name: "Master Handyman Services",
    category: "Handyman",
    description: "Your one-stop solution for all home repairs and improvements. From small fixes to major renovations.",
    serviceArea: "Los Angeles County",
    city: "Los Angeles",
    zipCode: "90015",
    phone: "(555) 234-5678",
    email: "info@masterhandyman.com",
    website: "https://masterhandyman.example.com",
    socialMedia: {
      instagram: "https://instagram.com/masterhandyman",
      facebook: "https://facebook.com/masterhandyman",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80",
    ],
    rating: 4.9,
    reviewCount: 203,
    reviews: [
      {
        id: "r4",
        authorName: "David Lee",
        rating: 5,
        date: "2025-10-08",
        comment: "Incredible work! They fixed multiple issues in my home efficiently and professionally. Will definitely use again."
      },
      {
        id: "r5",
        authorName: "Lisa Martinez",
        rating: 5,
        date: "2025-10-01",
        comment: "Very skilled and reliable. Completed the job faster than expected and the quality is outstanding."
      }
    ],
    featured: true
  },
  {
    id: "3",
    name: "Elite Driving Academy",
    category: "Driving instructor/school",
    description: "Professional driving instruction for beginners and advanced drivers. State-certified instructors with over 15 years of experience.",
    serviceArea: "Los Angeles Metro",
    city: "Los Angeles",
    zipCode: "90210",
    phone: "(555) 345-6789",
    email: "learn@elitedriving.com",
    website: "https://elitedriving.example.com",
    socialMedia: {
      facebook: "https://facebook.com/elitedriving",
      instagram: "https://instagram.com/elitedriving",
      twitter: "https://twitter.com/elitedriving",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
      "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=800&q=80",
    ],
    rating: 4.7,
    reviewCount: 89,
    reviews: [
      {
        id: "r6",
        authorName: "Jessica Park",
        rating: 5,
        date: "2025-10-10",
        comment: "Patient and knowledgeable instructors. Passed my test on the first try thanks to their excellent training!"
      }
    ]
  },
  {
    id: "4",
    name: "CoolAir HVAC Experts",
    category: "HVAC",
    description: "Complete heating and cooling solutions. Installation, maintenance, and emergency repairs. Licensed and insured.",
    serviceArea: "Los Angeles & Orange County",
    city: "Los Angeles",
    zipCode: "90028",
    phone: "(555) 456-7890",
    email: "service@coolairhvac.com",
    website: "https://coolairhvac.example.com",
    socialMedia: {
      facebook: "https://facebook.com/coolairhvac",
      instagram: "https://instagram.com/coolairhvac",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800&q=80",
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
    ],
    rating: 4.6,
    reviewCount: 156,
    reviews: [
      {
        id: "r7",
        authorName: "Robert Taylor",
        rating: 5,
        date: "2025-10-07",
        comment: "Quick response time and fixed our AC on a hot summer day. Great service and reasonable prices."
      },
      {
        id: "r8",
        authorName: "Amanda White",
        rating: 4,
        date: "2025-09-30",
        comment: "Professional team, did a great job installing our new system."
      }
    ]
  },
  {
    id: "5",
    name: "Precision Auto Care",
    category: "Auto Mechanic",
    description: "Full-service auto repair shop with ASE-certified mechanics. Specializing in all makes and models.",
    serviceArea: "Los Angeles South Bay",
    city: "Los Angeles",
    zipCode: "90045",
    phone: "(555) 567-8901",
    email: "info@precisionauto.com",
    socialMedia: {
      instagram: "https://instagram.com/precisionauto",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80",
      "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=800&q=80",
    ],
    rating: 4.8,
    reviewCount: 178,
    reviews: [
      {
        id: "r9",
        authorName: "Chris Anderson",
        rating: 5,
        date: "2025-10-09",
        comment: "Honest and reliable mechanics. They diagnosed the problem accurately and fixed it at a fair price."
      }
    ]
  },
  {
    id: "6",
    name: "BuildRight Contractors",
    category: "Builder/Contractor",
    description: "Licensed general contractor for residential and commercial projects. Specializing in custom builds and renovations.",
    serviceArea: "Greater Los Angeles",
    city: "Los Angeles",
    zipCode: "90012",
    phone: "(555) 678-9012",
    email: "projects@buildright.com",
    website: "https://buildright.example.com",
    socialMedia: {
      instagram: "https://instagram.com/buildright",
      facebook: "https://facebook.com/buildright",
      linkedin: "https://linkedin.com/company/buildright",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=80",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    ],
    rating: 4.9,
    reviewCount: 94,
    reviews: [
      {
        id: "r10",
        authorName: "Karen Miller",
        rating: 5,
        date: "2025-10-06",
        comment: "Outstanding work on our home renovation! Professional, timely, and excellent craftsmanship."
      }
    ],
    featured: true
  },
  {
    id: "7",
    name: "Capture Moments Photography",
    category: "Photographer/Videographer",
    description: "Professional photography and videography for weddings, events, and commercial projects.",
    serviceArea: "Los Angeles & Ventura County",
    city: "Los Angeles",
    zipCode: "90024",
    phone: "(555) 789-0123",
    email: "hello@capturemoments.com",
    website: "https://capturemoments.example.com",
    socialMedia: {
      instagram: "https://instagram.com/capturemoments",
      facebook: "https://facebook.com/capturemoments",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&q=80",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    ],
    rating: 5.0,
    reviewCount: 145,
    reviews: [
      {
        id: "r11",
        authorName: "Jennifer Brown",
        rating: 5,
        date: "2025-10-04",
        comment: "Amazing photographer! Our wedding photos turned out absolutely stunning. Highly recommend!"
      }
    ]
  },
  {
    id: "8",
    name: "VoltPro Electricians",
    category: "Electrician",
    description: "Licensed electricians for residential and commercial electrical services. Emergency service available 24/7.",
    serviceArea: "Los Angeles County",
    city: "Los Angeles",
    zipCode: "90031",
    phone: "(555) 890-1234",
    email: "service@voltpro.com",
    socialMedia: {
      facebook: "https://facebook.com/voltpro",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80",
      "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80",
    ],
    rating: 4.7,
    reviewCount: 112,
    reviews: [
      {
        id: "r12",
        authorName: "Tom Wilson",
        rating: 5,
        date: "2025-10-02",
        comment: "Very professional and knowledgeable. Fixed our electrical issues quickly and safely."
      }
    ]
  },
  {
    id: "9",
    name: "FlowMaster Plumbing",
    category: "Plumber",
    description: "Expert plumbing services for all your residential and commercial needs. Same-day service available.",
    serviceArea: "Los Angeles Metro Area",
    city: "Los Angeles",
    zipCode: "90017",
    phone: "(555) 901-2345",
    email: "info@flowmaster.com",
    website: "https://flowmaster.example.com",
    socialMedia: {
      instagram: "https://instagram.com/flowmaster",
      facebook: "https://facebook.com/flowmaster",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=80",
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80",
    ],
    rating: 4.8,
    reviewCount: 187,
    reviews: [
      {
        id: "r13",
        authorName: "Patricia Garcia",
        rating: 5,
        date: "2025-10-11",
        comment: "Excellent plumber! Fixed our leak quickly and cleaned up perfectly. Very satisfied."
      }
    ]
  },
  {
    id: "10",
    name: "SparkleClean Housekeeping",
    category: "Housekeeper",
    description: "Professional house cleaning services. Weekly, bi-weekly, and one-time deep cleaning available.",
    serviceArea: "Los Angeles Westside",
    city: "Los Angeles",
    zipCode: "90025",
    phone: "(555) 012-3456",
    email: "book@sparkleclean.com",
    socialMedia: {
      instagram: "https://instagram.com/sparkleclean",
    },
    portfolio: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
      "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&q=80",
    ],
    rating: 4.9,
    reviewCount: 234,
    reviews: [
      {
        id: "r14",
        authorName: "Susan Lee",
        rating: 5,
        date: "2025-10-03",
        comment: "Best cleaning service I've ever used! Thorough, reliable, and friendly staff."
      }
    ]
  }
];
