import { useState } from 'react'
import { CartoonButton } from './components/ui/CartoonButton'
import { Badge } from './components/ui/Badge'
import { Modal } from './components/ui/Modal'
import {
  ProfileDashboard,
  LIFE_STAGES,
  getLifeStageForAge,
  type LifeStage,
} from './components/layout/ProfileDashboard'
import { BottomNav, type TabType } from './components/layout/BottomNav'
import { LifeTimeline } from './components/game/LifeTimeline'
import { VitalityCard } from './components/game/VitalityCard'
import { DeathModal } from './components/game/DeathModal'
import { NewLifeScreen } from './modules/character/components/NewLifeScreen'
import { SchoolScreen } from './modules/education/components/SchoolScreen'
import { SchoolMilestoneModal } from './modules/education/components/SchoolMilestoneModal'
import { CareerScreen } from './modules/career/components/CareerScreen'
import { BusinessScreen } from './modules/business/components/BusinessScreen'
import { FiscalYearReportModal } from './modules/business/components/FiscalYearReportModal'
import { MenuScreen } from './components/layout/MenuScreen'
import { AssetsScreen } from './modules/assets/components/AssetsScreen'
import { LifestyleScreen } from './modules/lifestyle/components/LifestyleScreen'
import { PetsScreen } from './modules/pets/components/PetsScreen'
import { RelationshipsScreen } from './modules/relationships/components/RelationshipsScreen'
import { RomanceScreen } from './modules/romance/components/RomanceScreen'
import { HealthcareScreen } from './modules/healthcare/components/HealthcareScreen'
import { CrimeScreen } from './modules/crime/components/CrimeScreen'
import { CourtDefenseModal } from './modules/crime/components/CourtDefenseModal'
import { CRIME_MENU_MIN_AGE } from './modules/crime/components/crimeDisplay'
import { hasPendingCourtCase } from './modules/crime/services/crimeSelectors'
import { IdentityHeritageScreen } from './modules/identity/components/IdentityHeritageScreen'
import type { BusinessFiscalReport } from './modules/business/types'
import { getSchoolMilestoneNotice } from './modules/education/services/educationService'
import type { SchoolMilestoneNotice } from './modules/education/types'
import { ageUpCharacter } from './modules/aging/services/agingService'
import { rollEventForCharacter, resolveEventChoice } from './modules/events/services/eventService'
import { EventModal, type EventResult } from './modules/events/components/EventModal'
import type { EventChoice, LifeEventTemplate } from './modules/events/types'
import { BabyNamingModal } from './modules/romance/components/BabyNamingModal'
import type { CharacterProfile, PersonProfile, ChildProfile } from './types/game'

export default function App() {
  const [activeCharacter, setActiveCharacter] = useState<CharacterProfile | null>(null)
  const [currentTab, setCurrentTab] = useState<TabType>('life')
  const [selectedStage, setSelectedStage] = useState<LifeStage | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeathModalOpen, setIsDeathModalOpen] = useState(false)

  // Interactive event & school milestone state
  const [pendingEvent, setPendingEvent] = useState<LifeEventTemplate | null>(null)
  const [eventResult, setEventResult] = useState<EventResult | null>(null)
  const [schoolMilestone, setSchoolMilestone] = useState<SchoolMilestoneNotice | null>(null)
  const [isUniversityModalOpen, setIsUniversityModalOpen] = useState(false)
  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false)
  const [activeFiscalReport, setActiveFiscalReport] = useState<BusinessFiscalReport | null>(null)
  const [pendingNewbornBirth, setPendingNewbornBirth] = useState<ChildProfile | null>(null)
  const [menuView, setMenuView] = useState<'hub' | 'relationships' | 'romance' | 'assets' | 'lifestyle' | 'pets' | 'healthcare' | 'crime' | 'identity'>('hub')
  const [openedIdentityFromDeath, setOpenedIdentityFromDeath] = useState(false)
  const [isHoldingCourtForArrest, setIsHoldingCourtForArrest] = useState(false)

  const handleStartLife = (newCharacter: CharacterProfile) => {
    setActiveCharacter(newCharacter)
    setSelectedStage('childhood')
    setCurrentTab('life')
    setMenuView('hub')
    setOpenedIdentityFromDeath(false)
    setIsHoldingCourtForArrest(false)
    setIsDeathModalOpen(false)
    setSchoolMilestone(null)
    setPendingNewbornBirth(null)
    setIsUniversityModalOpen(false)
    setIsProfessionalModalOpen(false)
    setActiveFiscalReport(null)
  }

  const handleAgeUp = () => {
    if (
      !activeCharacter ||
      !activeCharacter.isAlive ||
      pendingEvent ||
      schoolMilestone ||
      activeFiscalReport ||
      pendingNewbornBirth ||
      hasPendingCourtCase(activeCharacter)
    ) {
      return
    }

    const agedCharacter = ageUpCharacter(activeCharacter)
    setActiveCharacter(agedCharacter)
    setSelectedStage(getLifeStageForAge(agedCharacter.age))

    if (!agedCharacter.isAlive) {
      setIsDeathModalOpen(true)
      return
    }

    // Prioritize baby birth announcement modal if pregnancy resolved
    if (agedCharacter.newbornAnnouncement) {
      setPendingNewbornBirth(agedCharacter.newbornAnnouncement)
      return
    }

    // Show a milestone modal when enrolling in Elementary/Middle/High School or Graduating
    const schoolNotice = getSchoolMilestoneNotice(agedCharacter)
    if (schoolNotice) {
      setSchoolMilestone(schoolNotice)
      return
    }

    // Show annual fiscal year report if player runs an active business
    if (agedCharacter.business?.lastFiscalReport) {
      setActiveFiscalReport(agedCharacter.business.lastFiscalReport)
    }

    // Roll random life event for the current year
    const event = rollEventForCharacter(agedCharacter)
    if (event) setPendingEvent(event)
  }

  const handleConfirmBabyNaming = (firstName: string, lastName: string) => {
    if (!activeCharacter || !pendingNewbornBirth) return

    const updatedChildren = (activeCharacter.children || []).map((child) =>
      child.id === pendingNewbornBirth.id
        ? { ...child, firstName, lastName }
        : child
    )

    // Update the timeline birth event message with the chosen name
    const updatedTimeline = activeCharacter.timeline.map((evt) => {
      if (evt.title === 'Baby Born! 👶' && evt.age === activeCharacter.age) {
        return {
          ...evt,
          message: `You welcomed a beautiful newborn ${pendingNewbornBirth.gender === 'female' ? 'daughter' : 'son'}, ${firstName} ${lastName}, into the world! Welcome to parenthood! 🍼✨`,
        }
      }
      return evt
    })

    const updatedCharacter: CharacterProfile = {
      ...activeCharacter,
      children: updatedChildren,
      timeline: updatedTimeline,
      newbornAnnouncement: undefined,
    }

    setActiveCharacter(updatedCharacter)
    setPendingNewbornBirth(null)

    // Resume age-up milestone checks after naming baby
    const schoolNotice = getSchoolMilestoneNotice(updatedCharacter)
    if (schoolNotice) {
      setSchoolMilestone(schoolNotice)
      return
    }

    if (updatedCharacter.business?.lastFiscalReport) {
      setActiveFiscalReport(updatedCharacter.business.lastFiscalReport)
    }

    const event = rollEventForCharacter(updatedCharacter)
    if (event) setPendingEvent(event)
  }

  const handleChooseOption = (choice: EventChoice, boundPerson?: PersonProfile) => {
    if (!activeCharacter || !pendingEvent) return

    const resolution = resolveEventChoice(activeCharacter, pendingEvent, choice, boundPerson)
    setActiveCharacter(resolution.character)
    setEventResult({
      choice,
      message: resolution.message,
      applied: resolution.applied,
      personIntroduced: resolution.personIntroduced,
    })
  }

  const handleCloseEvent = () => {
    const diedDuringEvent = activeCharacter && !activeCharacter.isAlive
    setPendingEvent(null)
    setEventResult(null)
    if (diedDuringEvent) {
      setIsDeathModalOpen(true)
    }
  }

  const handleRestart = () => {
    setActiveCharacter(null)
    setPendingEvent(null)
    setEventResult(null)
    setSchoolMilestone(null)
    setPendingNewbornBirth(null)
    setIsUniversityModalOpen(false)
    setIsDeathModalOpen(false)
    setIsMenuOpen(false)
    setMenuView('hub')
    setOpenedIdentityFromDeath(false)
    setIsHoldingCourtForArrest(false)
  }

  // Filter journal by the selected life stage
  const activeStageId =
    selectedStage || (activeCharacter ? getLifeStageForAge(activeCharacter.age) : 'childhood')
  const currentStageInfo = LIFE_STAGES.find((s) => s.id === activeStageId)
  const filteredEvents =
    activeCharacter?.timeline.filter(
      (evt) =>
        !currentStageInfo ||
        (evt.age >= currentStageInfo.minAge && evt.age <= currentStageInfo.maxAge)
    ) || []

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden p-2 sm:p-4 flex flex-col items-center justify-center">
      {/* Mobile Simulation Frame */}
      <main className="w-full max-w-[430px] h-full sm:h-[94vh] max-h-[880px] cartoon-card rounded-[32px] overflow-hidden flex flex-col transition-all duration-200">
        {/* VIEW 1: Character Creation Screen */}
        {!activeCharacter ? (
          <div className="flex flex-col h-full min-h-0">
            <header className="bg-amber-400 border-b-[3px] border-slate-900 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white border-2 border-slate-900 flex items-center justify-center text-xl shadow-[2px_2px_0_#0f172a]">
                  ✨
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-950 leading-tight">
                    LifeArc
                  </h1>
                  <p className="text-xs font-bold text-slate-800">
                    Create Your Character
                  </p>
                </div>
              </div>
              <Badge variant="slate" size="xs">
                Start Fresh
              </Badge>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto cartoon-scrollbar">
              <NewLifeScreen onStartLife={handleStartLife} />
            </div>
          </div>
        ) : (
          /* VIEW 2: Active Life Simulation Dashboard */
          <div className="flex flex-col h-full min-h-0">
            <div className="flex-shrink-0">
              <ProfileDashboard
                character={activeCharacter}
                selectedStage={activeStageId}
                onSelectStage={setSelectedStage}
                onOpenMenu={() => setIsMenuOpen(true)}
                countryFlag={activeCharacter.flag || '🌐'}
              />
            </div>

            {/* TAB CONTENT: LIFE */}
            {currentTab === 'life' && (
              <div className="flex-1 min-h-0 flex flex-col bg-white p-3.5 pb-2">
                {/* 1. Life Journal Section (Takes all available middle height) */}
                <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1 flex-shrink-0">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <span>{currentStageInfo?.icon}</span>
                      <span>{currentStageInfo?.label} Journal</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  <LifeTimeline events={filteredEvents} stageLabel={currentStageInfo?.label} />
                </div>

                {/* 2. Pinned Bottom Dock: Horizontal Stats Strip + Primary Action */}
                <div className="pt-1.5 flex flex-col gap-1.5 flex-shrink-0">
                  <VitalityCard stats={activeCharacter.stats} />

                  {activeCharacter.isAlive ? (
                    <CartoonButton
                      variant="emerald"
                      size="lg"
                      fullWidth
                      onClick={handleAgeUp}
                      disabled={
                        !!pendingEvent ||
                        !!schoolMilestone ||
                        !!activeFiscalReport ||
                        !!pendingNewbornBirth ||
                        hasPendingCourtCase(activeCharacter)
                      }
                      icon={<span className="text-xl">⏳</span>}
                    >
                      AGE UP (+1 YEAR) •{' '}
                      <span className="opacity-95 font-mono">Age {activeCharacter.age + 1}</span>
                    </CartoonButton>
                  ) : (
                    <CartoonButton
                      variant="amber"
                      size="lg"
                      fullWidth
                      onClick={handleRestart}
                      icon={<span className="text-xl">🕊️</span>}
                    >
                      START A NEW LIFE
                    </CartoonButton>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: SCHOOL */}
            {currentTab === 'school' && (
              <div className="flex-1 min-h-0 overflow-y-auto cartoon-scrollbar bg-white">
                <SchoolScreen
                  character={activeCharacter}
                  onUpdateCharacter={setActiveCharacter}
                  isUniversityModalOpen={isUniversityModalOpen}
                  onSetUniversityModalOpen={setIsUniversityModalOpen}
                  isProfessionalModalOpen={isProfessionalModalOpen}
                  onSetProfessionalModalOpen={setIsProfessionalModalOpen}
                />
              </div>
            )}

            {/* TAB CONTENT: CAREERS */}
            {currentTab === 'careers' && (
              <div className="flex-1 min-h-0 overflow-y-auto cartoon-scrollbar bg-white">
                <CareerScreen
                  character={activeCharacter}
                  onUpdateCharacter={setActiveCharacter}
                  onOpenSchoolTab={() => setCurrentTab('school')}
                />
              </div>
            )}

            {/* TAB CONTENT: BUSINESS */}
            {currentTab === 'business' && (
              <div className="flex-1 min-h-0 overflow-y-auto cartoon-scrollbar bg-white">
                <BusinessScreen
                  character={activeCharacter}
                  onUpdateCharacter={setActiveCharacter}
                />
              </div>
            )}

            {/* TAB CONTENT: MENU & ACTIVITIES */}
            {currentTab === 'menu' && (
              <div className="flex-1 min-h-0 overflow-y-auto cartoon-scrollbar bg-white">
                {menuView === 'relationships' ? (
                  <RelationshipsScreen
                    character={activeCharacter}
                    onUpdateCharacter={setActiveCharacter}
                    onBackToMenu={() => setMenuView('hub')}
                  />
                ) : menuView === 'lifestyle' && activeCharacter.age >= 16 ? (
                  <LifestyleScreen
                    character={activeCharacter}
                    onUpdateCharacter={setActiveCharacter}
                    onBackToMenu={() => setMenuView('hub')}
                  />
                ) : menuView === 'pets' && activeCharacter.age >= 16 ? (
                  <PetsScreen
                    character={activeCharacter}
                    onUpdateCharacter={setActiveCharacter}
                    onBackToMenu={() => setMenuView('hub')}
                  />
                ) : menuView === 'assets' && activeCharacter.age >= 18 ? (
                  <AssetsScreen
                    character={activeCharacter}
                    onUpdateCharacter={setActiveCharacter}
                    onBackToMenu={() => setMenuView('hub')}
                  />
                ) : menuView === 'romance' && activeCharacter.age >= 16 ? (
                  <RomanceScreen
                    character={activeCharacter}
                    onUpdateCharacter={setActiveCharacter}
                    onBackToMenu={() => setMenuView('hub')}
                    onOpenRelationships={() => setMenuView('relationships')}
                  />
                ) : menuView === 'healthcare' && activeCharacter.age >= 6 ? (
                  <HealthcareScreen
                    character={activeCharacter}
                    onUpdateCharacter={setActiveCharacter}
                    onBackToMenu={() => setMenuView('hub')}
                  />
                ) : menuView === 'crime' && activeCharacter.age >= CRIME_MENU_MIN_AGE ? (
                  <CrimeScreen
                    character={activeCharacter}
                    onUpdateCharacter={setActiveCharacter}
                    onBackToMenu={() => {
                      setIsHoldingCourtForArrest(false);
                      setMenuView('hub');
                    }}
                    onArrestSummaryVisibilityChange={setIsHoldingCourtForArrest}
                  />
                ) : menuView === 'identity' ? (
                  <IdentityHeritageScreen
                    key={activeCharacter.id}
                    character={activeCharacter}
                    backLabel={openedIdentityFromDeath ? 'Obituary' : 'Menu'}
                    onBackToMenu={() => {
                      if (openedIdentityFromDeath) {
                        setOpenedIdentityFromDeath(false);
                        setMenuView('hub');
                        setCurrentTab('life');
                        setIsDeathModalOpen(true);
                      } else {
                        setMenuView('hub');
                      }
                    }}
                  />
                ) : (
                  <MenuScreen
                    character={activeCharacter}
                    onOpenRelationships={() => setMenuView('relationships')}
                    onOpenRomance={() => {
                      if (activeCharacter.age >= 16) {
                        setMenuView('romance');
                      }
                    }}
                    onOpenAssets={() => {
                      if (activeCharacter.age >= 18) {
                        setMenuView('assets');
                      }
                    }}
                    onOpenLifestyle={() => {
                      if (activeCharacter.age >= 16) {
                        setMenuView('lifestyle');
                      }
                    }}
                    onOpenPets={() => {
                      if (activeCharacter.age >= 16) {
                        setMenuView('pets');
                      }
                    }}
                    onOpenHealthcare={() => {
                      if (activeCharacter.age >= 6) {
                        setMenuView('healthcare');
                      }
                    }}
                    onOpenCrime={() => {
                      if (activeCharacter.age >= CRIME_MENU_MIN_AGE) {
                        setMenuView('crime');
                      }
                    }}
                    onOpenIdentity={() => {
                      setOpenedIdentityFromDeath(false);
                      setMenuView('identity');
                    }}
                  />
                )}
              </div>
            )}

            <div className="flex-shrink-0">
              <BottomNav
                currentTab={currentTab}
                onTabChange={(tab) => {
                  setCurrentTab(tab);
                  setOpenedIdentityFromDeath(false);
                  if (tab === 'menu') {
                    setIsHoldingCourtForArrest(false);
                    setMenuView('hub');
                  } else {
                    setIsHoldingCourtForArrest(false);
                  }
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* School Enrollment & Graduation Milestone Modal */}
      {activeCharacter && (
        <SchoolMilestoneModal
          notice={schoolMilestone}
          onClose={() => setSchoolMilestone(null)}
          onOpenSchoolTab={() => {
            setSchoolMilestone(null)
            setCurrentTab('school')
          }}
          onApplyUniversity={() => {
            setSchoolMilestone(null)
            setCurrentTab('school')
            setIsUniversityModalOpen(true)
          }}
          onApplyProfessional={() => {
            setSchoolMilestone(null)
            setCurrentTab('school')
            setIsProfessionalModalOpen(true)
          }}
          onOpenCareersTab={() => {
            setSchoolMilestone(null)
            setCurrentTab('careers')
          }}
        />
      )}

      {/* Baby Birth Announcement & Naming Modal */}
      {pendingNewbornBirth && activeCharacter && (
        <BabyNamingModal
          isOpen={true}
          baby={pendingNewbornBirth}
          playerLastName={activeCharacter.lastName}
          partnerLastName={activeCharacter.partner?.lastName}
          onConfirm={handleConfirmBabyNaming}
        />
      )}

      {/* Interactive Life Event */}
      {activeCharacter && (
        <EventModal
          event={pendingEvent}
          character={activeCharacter}
          result={eventResult}
          onChoose={handleChooseOption}
          onContinue={handleCloseEvent}
        />
      )}

      {/* Fiscal Year Financial Report Modal */}
      {activeCharacter && (
        <FiscalYearReportModal
          isOpen={Boolean(activeFiscalReport)}
          businessName={activeCharacter.business?.name || 'Your Company'}
          report={activeFiscalReport}
          onClose={() => setActiveFiscalReport(null)}
        />
      )}

      {/* Non-dismissible Court Defense & Sentencing Modal */}
      {activeCharacter && (
        <CourtDefenseModal
          character={activeCharacter}
          pendingCase={activeCharacter.isAlive ? (activeCharacter.crime?.pendingCase ?? null) : null}
          onUpdateCharacter={setActiveCharacter}
          holdOpenForArrestSummary={isHoldingCourtForArrest}
        />
      )}

      {/* End of Life / Obituary Modal */}
      {activeCharacter && (
        <DeathModal
          character={activeCharacter}
          isOpen={isDeathModalOpen}
          onStartNewLife={handleRestart}
          onViewIdentity={() => {
            setIsDeathModalOpen(false)
            setOpenedIdentityFromDeath(true)
            setCurrentTab('menu')
            setMenuView('identity')
          }}
          onClose={() => setIsDeathModalOpen(false)}
        />
      )}

      {/* Game Menu */}
      <Modal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title="Game Menu"
        icon="⚙️"
        actions={
          <>
            <CartoonButton variant="rose" size="md" fullWidth onClick={handleRestart}>
              Start a New Life (Reset)
            </CartoonButton>
            <CartoonButton variant="white" size="md" fullWidth onClick={() => setIsMenuOpen(false)}>
              Continue Playing
            </CartoonButton>
          </>
        }
      >
        <p>
          Currently playing as{' '}
          <strong>
            {activeCharacter?.firstName} {activeCharacter?.lastName}
          </strong>{' '}
          (Age {activeCharacter?.age}).
        </p>
        <p className="text-xs text-slate-500">
          Want to start over with a fresh identity and birthplace?
        </p>
      </Modal>
    </div>
  );
}
