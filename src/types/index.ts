/**
 * # RoutesRed — Domain Types
 *
 * TypeScript interfaces for the RoutesRed transport platform.
 *
 * **Existing tables** (mirrored from the live Supabase schema):
 * - `public.users`                       → {@link User}
 * - `public.user_platforms`              → {@link UserPlatform}
 * - `routesred.transport_providers`      → {@link TransportProvider}
 * - `routesred.transport_provider_users` → {@link TransportProviderUser}
 * - `routesred.airports`                 → {@link Airport}
 * - `routesred.vehicle_types`            → {@link VehicleType}
 * - `routesred.amenities`                → {@link Amenity}
 *
 * **Forward-declared tables** (not yet in the database; types reflect the
 * intended domain shape and will match the migration that creates them):
 * - `routesred.vehicles`             → {@link Vehicle}
 * - `routesred.vehicle_images`       → {@link VehicleImage}
 * - `routesred.drivers`              → {@link Driver}
 * - `routesred.document_types`       → {@link DocumentType}
 * - `routesred.provider_documents`   → {@link ProviderDocument}
 * - `routesred.provider_agency_links`→ {@link ProviderAgencyLink}
 *
 * @packageDocumentation
 */

/* ------------------------------------------------------------------ *
 * Primitive aliases
 * ------------------------------------------------------------------ */

/**
 * ISO-8601 timestamp string as returned by Postgres `timestamptz`
 * (e.g. `"2026-08-27T00:26:57.027Z"`).
 */
export type ISODateString = string;

/**
 * PostGIS `geography(Point, 4326)` value serialised to GeoJSON Point
 * geometry by the Supabase PostgREST JSON encoder.
 *
 * Coordinates are `[longitude, latitude]` per the GeoJSON spec.
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

/* ------------------------------------------------------------------ *
 * Enum-like union types (derived from CHECK constraints)
 * ------------------------------------------------------------------ */

/** `public.users.role` — platform-wide role. */
export type UserRole =
  | 'traveler'
  | 'agency'
  | 'admin'
  | 'accountant'
  | 'account_executive'
  | 'transport_provider';

/** `public.user_platforms.platform` — ecosystem platform identifier. */
export type PlatformCode = 'toursred' | 'routesred' | 'naturestayred';

/** `public.user_platforms.status` */
export type PlatformStatus = 'active' | 'inactive';

/** `public.user_platforms.registration_source` */
export type RegistrationSource = PlatformCode | 'system';

/** `routesred.transport_providers.provider_type` */
export type ProviderType = 'individual' | 'company';

/** `routesred.transport_providers.status` — lifecycle state. */
export type ProviderStatus =
  | 'draft'
  | 'pending_review'
  | 'active'
  | 'suspended'
  | 'rejected'
  | 'inactive';

/** `routesred.transport_providers.verification_status` — KYC state. */
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

/** `routesred.transport_provider_users.role` — membership role within a provider. */
export type ProviderMemberRole =
  | 'owner'
  | 'administrator'
  | 'dispatcher'
  | 'finance'
  | 'operator_manager'
  | 'viewer';

/** `routesred.transport_provider_users.status` */
export type ProviderMemberStatus = 'active' | 'inactive' | 'invited';

/* ------------------------------------------------------------------ *
 * public.users
 * ------------------------------------------------------------------ */

/**
 * Shared user profile row — `public.users`.
 *
 * One row per `auth.users` record; the PK `id` is a foreign key to
 * `auth.users(id)`. Email is kept in sync from `auth.users` by a
 * `BEFORE INSERT OR UPDATE` trigger.
 */
export interface User {
  /** UUID matching `auth.users.id`. */
  id: string;
  /** Email copied from `auth.users` by the `sync_user_email` trigger. */
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  /** Platform role; defaults to `'traveler'` on signup. */
  role: UserRole;
  /** Grants cross-platform admin powers when `true`. */
  is_super_admin: boolean;
  /** Soft-disable flag; `false` blocks login-derived access. */
  is_active: boolean;
  /** Approval gate; `false` means awaiting admin approval. */
  is_approved: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ *
 * public.user_platforms
 * ------------------------------------------------------------------ */

/**
 * Per-platform membership row — `public.user_platforms`.
 *
 * Tracks which ecosystem platforms (toursred / routesred / naturestayred)
 * a user has accessed and their onboarding state. Mutated only via
 * SECURITY DEFINER RPCs (`register_platform_access`, etc.).
 */
export interface UserPlatform {
  id: string;
  user_id: string;
  platform: PlatformCode;
  status: PlatformStatus;
  registration_source: RegistrationSource;
  registered_at: ISODateString;
  last_access_at: ISODateString | null;
  onboarding_completed: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ *
 * routesred.transport_providers
 * ------------------------------------------------------------------ */

/**
 * A transport provider (individual or company) — `routesred.transport_providers`.
 *
 * Owns vehicles, drivers, and documents. `owner_user_id` is the creating
 * user; additional members are linked via {@link TransportProviderUser}.
 */
export interface TransportProvider {
  id: string;
  /** Creating/owning user (`auth.users.id`). */
  owner_user_id: string;
  provider_type: ProviderType;
  /** Individual only — given name. */
  first_name: string | null;
  /** Individual only — family name. */
  last_name: string | null;
  /** Company only — legal entity name. */
  legal_name: string | null;
  /** Company only — legal representative name. */
  legal_representative: string | null;
  /** Company only — commercial trade name. */
  trade_name: string | null;
  /** URL-safe unique slug (reserved words excluded by CHECK). */
  slug: string;
  /** Mexican tax ID (Registro Federal de Contribuyentes). */
  rfc: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  /** ISO 3166-1 alpha-2 country code; defaults to `'MX'`. */
  country_code: string;
  state: string | null;
  city: string | null;
  address: string | null;
  postal_code: string | null;
  /** PostGIS Point geography (lon/lat). `null` when not geocoded. */
  coordinates: GeoJSONPoint | null;
  status: ProviderStatus;
  verification_status: VerificationStatus;
  /** Aggregate rating, 0–5 with 2 decimals. */
  rating_average: number;
  /** Number of ratings contributing to `rating_average`. */
  rating_count: number;
  /** Lifetime count of completed services. */
  completed_services_count: number;
  /** Business active flag (distinct from lifecycle `status`). */
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ *
 * routesred.transport_provider_users
 * ------------------------------------------------------------------ */

/**
 * Membership/role link between a user and a transport provider —
 * `routesred.transport_provider_users`.
 *
 * Unique per `(transport_provider_id, user_id)`. `invited_by` is set
 * when a user is invited rather than self-joining.
 */
export interface TransportProviderUser {
  id: string;
  transport_provider_id: string;
  user_id: string;
  role: ProviderMemberRole;
  status: ProviderMemberStatus;
  /** `auth.users.id` of the inviter, or `null` for self-join/owner. */
  invited_by: string | null;
  joined_at: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ *
 * routesred.vehicle_types  (catalog)
 * ------------------------------------------------------------------ */

/**
 * Catalog of vehicle categories — `routesred.vehicle_types`.
 *
 * Seeded reference data (Car, SUV, Van, Sprinter, Minibus, Bus,
 * Executive Bus, Other). Publicly readable; admin-managed.
 */
export interface VehicleType {
  id: string;
  /** Stable internal code, e.g. `'sprinter'`. */
  code: string;
  name: string;
  description: string | null;
  /** Optional icon identifier for UI rendering. */
  icon: string | null;
  /** Minimum passenger capacity (inclusive). */
  min_capacity: number | null;
  /** Maximum passenger capacity (inclusive). */
  max_capacity: number | null;
  active: boolean;
  /** Sort order for UI listing. */
  sort_order: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ *
 * routesred.amenities  (catalog)
 * ------------------------------------------------------------------ */

/**
 * Catalog of vehicle amenities — `routesred.amenities`.
 *
 * Seeded reference data (WiFi, USB, A/C, Restroom, …). Publicly
 * readable; admin-managed.
 */
export interface Amenity {
  id: string;
  /** Stable internal code, e.g. `'wifi'`. */
  code: string;
  name: string;
  description: string | null;
  /** Optional icon identifier for UI rendering. */
  icon: string | null;
  active: boolean;
  /** Sort order for UI listing. */
  sort_order: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ------------------------------------------------------------------ *
 * routesred.airports  (catalog)
 * ------------------------------------------------------------------ */

/**
 * Airport reference row — `routesred.airports`.
 *
 * Seeded with 23 Mexican airports. `iata_code` / `icao_code` are
 * unique where non-null. Coordinates are PostGIS geography points.
 */
export interface Airport {
  id: string;
  /** 3-letter IATA code (e.g. `'MEX'`), unique when present. */
  iata_code: string | null;
  /** 4-letter ICAO code (e.g. `'MMMX'`), unique when present. */
  icao_code: string | null;
  name: string;
  city: string;
  state: string | null;
  country: string;
  /** ISO 3166-1 alpha-2 country code; defaults to `'MX'`. */
  country_code: string;
  /** PostGIS Point geography (lon/lat). */
  coordinates: GeoJSONPoint | null;
  /** IANA timezone, e.g. `'America/Mexico_City'`. */
  timezone: string | null;
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/* ================================================================== *
 * Forward-declared tables (not yet in the database)
 * The interfaces below follow the domain conventions established by
 * the existing schema (uuid PKs, timestamptz defaults, RLS-friendly
 * owner/provider FKs). Adjust when the creating migration lands.
 * ================================================================== */

/** Lifecycle state for a vehicle listing. */
export type VehicleStatus = 'draft' | 'active' | 'maintenance' | 'retired';

/**
 * A vehicle owned by a transport provider — `routesred.vehicles`.
 *
 * Belongs to a {@link TransportProvider}; categorised by a
 * {@link VehicleType}; may carry many {@link Amenity} and
 * {@link VehicleImage} rows.
 *
 * @remarks Forward-declared — table not yet created in the database.
 */
export interface Vehicle {
  id: string;
  /** Owning provider. */
  transport_provider_id: string;
  /** Category — FK to {@link VehicleType.id}. */
  vehicle_type_id: string;
  /** Internal fleet identifier (e.g. `"UNIDAD-012"`). */
  internal_code: string | null;
  /** Manufacturer brand (e.g. `"Mercedes-Benz"`). */
  make: string | null;
  /** Model name (e.g. `"Sprinter 515CDI"`). */
  model: string | null;
  /** Model year (e.g. `2024`). */
  year: number | null;
  /** Licence plate number. */
  plate: string | null;
  /** VIN / chassis number. */
  vin: string | null;
  /** Hex colour label for UI display (e.g. `"#ffffff"`). */
  color: string | null;
  /** Passenger capacity. */
  capacity: number | null;
  /** Luggage capacity in pieces. */
  luggage_capacity: number | null;
  /** Public-facing description. */
  description: string | null;
  /** Primary display image URL. */
  primary_image_url: string | null;
  status: VehicleStatus;
  /** Whether the vehicle is available for booking. */
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * A photograph attached to a vehicle — `routesred.vehicle_images`.
 *
 * Ordered gallery; `is_primary` designates the listing thumbnail.
 *
 * @remarks Forward-declared — table not yet created in the database.
 */
export interface VehicleImage {
  id: string;
  /** FK to {@link Vehicle.id}. */
  vehicle_id: string;
  /** Storage URL of the image. */
  image_url: string;
  /** Optional caption / alt text. */
  caption: string | null;
  /** Display order within the vehicle gallery (ascending). */
  sort_order: number;
  /** Marks the thumbnail used in listings. */
  is_primary: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** Lifecycle state for a driver assignment. */
export type DriverStatus = 'active' | 'inactive' | 'on_leave' | 'terminated';

/** Type of driving licence held. */
export type LicenceType =
  | 'a'
  | 'a1'
  | 'b'
  | 'b1'
  | 'c'
  | 'c1'
  | 'd'
  | 'd1'
  | 'e'
  | 'e1';

/**
 * A driver employed by or contracted to a provider — `routesred.drivers`.
 *
 * May optionally be linked to an `auth.users` account (`user_id`) when
 * the driver also logs into the platform.
 *
 * @remarks Forward-declared — table not yet created in the database.
 */
export interface Driver {
  id: string;
  /** Owning provider. */
  transport_provider_id: string;
  /** Optional linked platform user (`auth.users.id`). */
  user_id: string | null;
  first_name: string;
  last_name: string;
  /** Phone number for contact. */
  phone: string | null;
  /** Email address. */
  email: string | null;
  /** Driver's licence number. */
  licence_number: string | null;
  /** Class of licence held. */
  licence_type: LicenceType | null;
  /** Licence expiry date (ISO date or datetime). */
  licence_expiry: ISODateString | null;
  /** Portrait photo URL. */
  photo_url: string | null;
  /** Free-text notes visible to provider staff. */
  notes: string | null;
  status: DriverStatus;
  /** Whether the driver can be assigned to bookings. */
  active: boolean;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Catalog of document categories that a provider may need to upload —
 * `routesred.document_types`.
 *
 * Examples: RFC proof, insurance policy, driver licence, vehicle
 * registration. Used to validate and group {@link ProviderDocument}
 * uploads.
 *
 * @remarks Forward-declared — table not yet created in the database.
 */
export interface DocumentType {
  id: string;
  /** Stable internal code, e.g. `'insurance_policy'`. */
  code: string;
  name: string;
  description: string | null;
  /** Optional icon identifier for UI rendering. */
  icon: string | null;
  /** Whether the document is mandatory for provider verification. */
  required: boolean;
  /** Whether the document applies to a vehicle rather than the provider. */
  applies_to_vehicle: boolean;
  /** Whether the document applies to a driver rather than the provider. */
  applies_to_driver: boolean;
  /** Whether expiry is tracked for this document type. */
  has_expiry: boolean;
  active: boolean;
  sort_order: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/** Verification state of an uploaded document. */
export type DocumentVerificationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired';

/**
 * A document uploaded by a provider for verification —
 * `routesred.provider_documents`.
 *
 * Polymorphic-ish: optionally scoped to a {@link Vehicle} or
 * {@link Driver} via nullable FKs, otherwise applies to the provider
 * itself.
 *
 * @remarks Forward-declared — table not yet created in the database.
 */
export interface ProviderDocument {
  id: string;
  /** Owning provider. */
  transport_provider_id: string;
  /** FK to {@link DocumentType.id}. */
  document_type_id: string;
  /** Optional scoped vehicle (`null` = provider-level document). */
  vehicle_id: string | null;
  /** Optional scoped driver (`null` = provider-level document). */
  driver_id: string | null;
  /** Original filename as uploaded. */
  file_name: string;
  /** Storage URL / path of the uploaded file. */
  file_url: string;
  /** MIME type of the uploaded file (e.g. `"application/pdf"`). */
  mime_type: string | null;
  /** File size in bytes. */
  file_size: number | null;
  /** Document issue date, if applicable. */
  issue_date: ISODateString | null;
  /** Document expiry date, if applicable. */
  expiry_date: ISODateString | null;
  verification_status: DocumentVerificationStatus;
  /** Admin / reviewer who last acted on the document. */
  reviewed_by: string | null;
  /** Timestamp of the last review action. */
  reviewed_at: ISODateString | null;
  /** Rejection or review note. */
  review_note: string | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}

/**
 * Status of a provider↔agency commercial link.
 *
 * @remarks Forward-declared — table not yet created in the database.
 */
export type AgencyLinkStatus = 'pending' | 'active' | 'suspended' | 'revoked';

/**
 * Commercial relationship between a transport provider and an agency —
 * `routesred.provider_agency_links`.
 *
 * An agency (a {@link User} with `role = 'agency'`) contracts one or
 * more providers for transfer services. The link carries commission /
 * pricing terms and an approval state.
 *
 * @remarks Forward-declared — table not yet created in the database.
 */
export interface ProviderAgencyLink {
  id: string;
  /** FK to {@link TransportProvider.id}. */
  transport_provider_id: string;
  /** Agency user (`auth.users.id`) — `public.users.role = 'agency'`. */
  agency_user_id: string;
  /** Commission percentage the agency earns (0–100). */
  commission_percentage: number | null;
  /** Default markup percentage the agency applies on top of net rates. */
  default_markup_percentage: number | null;
  /** Optional net rate list / contract reference. */
  contract_reference: string | null;
  /** Contract start date. */
  starts_at: ISODateString | null;
  /** Contract end date (`null` = open-ended). */
  ends_at: ISODateString | null;
  status: AgencyLinkStatus;
  /** `auth.users.id` of the user who initiated the link. */
  initiated_by: string | null;
  /** Timestamp of the most recent status change. */
  last_status_change_at: ISODateString | null;
  created_at: ISODateString;
  updated_at: ISODateString;
}
