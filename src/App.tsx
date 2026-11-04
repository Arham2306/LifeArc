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
import type { BusinessFiscalReport } from './modules/business/types'
import { getSchoolMilestoneNotice } from './modules/education/services/educationService'
import type { SchoolMilestoneNotice } from './modules/education/types'
import { ageUpCharacter } from './modules/aging/services/agingService'
import { rollEventForCharacter, resolveEventChoice } from './modules/events/services/eventService'
import { EventModal, type EventResult } from './modules/events/components/EventModal'
import type { EventChoice, LifeEventTemplate } from './modules/events/types'
import type { CharacterProfile } from './types/game'

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

  const handleStartLife = (newCharacter: CharacterProfile) => {
    setActiveCharacter(newCharacter)
    setSelectedStage('childhood')
    setCurrentTab('life')
    setIsDeathModalOpen(false)
    setSchoolMilestone(null)
    setIsUniversityModalOpen(false)
    setIsProfessionalModalOpen(false)
    setActiveFiscalReport(null)
  }

  const handleAgeUp = () => {
    if (!activeCharacter || !activeCharacter.isAlive || pendingEvent || schoolMilestone || activeFiscalReport) return

    const agedCharacter = ageUpCharacter(activeCharacter)
    setActiveCharacter(agedCharacter)
    setSelectedStage(getLifeStageForAge(agedCharacter.age))

    if (!agedCharacter.isAlive) {
      setIsDeathModalOpen(true)
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

  const handleChooseOption = (choice: EventChoice) => {
    if (!activeCharacter || !pendingEvent) return

    const resolution = resolveEventChoice(activeCharacter, pendingEvent, choice)
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
    setIsUniversityModalOpen(false)
    setIsDeathModalOpen(false)
    setIsMenuOpen(false)
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
    <div className="min-h-screen py-6 px-4 flex flex-col items-center justify-center">
      {/* Mobile Simulation Frame */}
      <main className="w-full max-w-[430px] cartoon-card rounded-[32px] overflow-hidden flex flex-col transition-all duration-200">
        {/* VIEW 1: Character Creation Screen */}
        {!activeCharacter ? (
          <div className="flex flex-col">
            <header className="bg-amber-400 border-b-[3px] border-slate-900 px-5 py-4 flex items-center justify-between">
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

            <NewLifeScreen onStartLife={handleStartLife} />
          </div>
        ) : (
          /* VIEW 2: Active Life Simulation Dashboard */
          <div className="flex flex-col">
            <ProfileDashboard
              character={activeCharacter}
              selectedStage={activeStageId}
              onSelectStage={setSelectedStage}
              onOpenMenu={() => setIsMenuOpen(true)}
              countryFlag={activeCharacter.flag || '🌐'}
            />

            {/* TAB CONTENT: LIFE */}
            {currentTab === 'life' && (
              <div className="p-4 flex flex-col gap-3 bg-white min-h-[480px]">
                {/* Life Journal */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between px-1">
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

                {/* Vitality Stats Card */}
                <VitalityCard stats={activeCharacter.stats} />

                {/* Primary Action Button */}
                <div className="pt-0.5">
                  {activeCharacter.isAlive ? (
                    <CartoonButton
                      variant="emerald"
                      size="lg"
                      fullWidth
                      onClick={handleAgeUp}
                      disabled={!!pendingEvent || !!schoolMilestone || !!activeFiscalReport}
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
              <SchoolScreen
                character={activeCharacter}
                onUpdateCharacter={setActiveCharacter}
                isUniversityModalOpen={isUniversityModalOpen}
                onSetUniversityModalOpen={setIsUniversityModalOpen}
                isProfessionalModalOpen={isProfessionalModalOpen}
                onSetProfessionalModalOpen={setIsProfessionalModalOpen}
              />
            )}

            {/* TAB CONTENT: CAREERS */}
            {currentTab === 'careers' && (
              <CareerScreen
                character={activeCharacter}
                onUpdateCharacter={setActiveCharacter}
                onOpenSchoolTab={() => setCurrentTab('school')}
              />
            )}

            {/* TAB CONTENT: BUSINESS */}
            {currentTab === 'business' && (
              <BusinessScreen
                character={activeCharacter}
                onUpdateCharacter={setActiveCharacter}
              />
            )}

            {/* TAB CONTENT: MENU (upcoming Module 6 Profile & Relationships) */}
            {currentTab === 'menu' && (
              <div className="p-6 flex flex-col items-center justify-center text-center gap-3 bg-white min-h-[480px]">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border-[2.5px] border-slate-900 flex items-center justify-center text-3xl shadow-[2px_3px_0_#0f172a]">
                  📱
                </div>
                <h3 className="font-black text-slate-900 text-lg">
                  Profile & Relationships
                </h3>
                <p className="text-xs font-bold text-slate-500 max-w-xs">
                  Full character biography, earned credentials gallery, family tree, and
                  interactive social & romance actions will unlock here in Module 6!
                </p>
                <CartoonButton variant="sky" size="sm" onClick={() => setCurrentTab('life')}>
                  Back to Life
                </CartoonButton>
              </div>
            )}

            <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
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

      {/* End of Life / Obituary Modal */}
      {activeCharacter && (
        <DeathModal
          character={activeCharacter}
          isOpen={isDeathModalOpen}
          onStartNewLife={handleRestart}
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
