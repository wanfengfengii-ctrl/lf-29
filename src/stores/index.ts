export * from './mask'
export * from './maskScheme'
export * from './versionManager'
export * from './craftTemplate'
export * from './craftTemplateCore'
export * from './teachingPractice'
export * from './reviewArchive'

import type { MaskStore } from './mask'
import type { MaskSchemeStore } from './maskScheme'
import type { VersionManagerStore } from './versionManager'
import type { CraftTemplateStore } from './craftTemplate'
import type { CraftTemplateCoreStore } from './craftTemplateCore'
import type { TeachingPracticeStore } from './teachingPractice'
import type { ReviewArchiveStore } from './reviewArchive'

export type AppStore =
  | MaskStore
  | MaskSchemeStore
  | VersionManagerStore
  | CraftTemplateStore
  | CraftTemplateCoreStore
  | TeachingPracticeStore
  | ReviewArchiveStore

export interface StoreCollection {
  mask: MaskStore
  maskScheme: MaskSchemeStore
  versionManager: VersionManagerStore
  craftTemplate: CraftTemplateStore
  craftTemplateCore: CraftTemplateCoreStore
  teachingPractice: TeachingPracticeStore
  reviewArchive: ReviewArchiveStore
}
