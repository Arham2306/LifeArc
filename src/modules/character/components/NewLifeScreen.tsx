import React, { useState, useEffect } from 'react'
import { Globe, MapPin, User, Dices, Rocket } from 'lucide-react'
import { CartoonButton } from '../../../components/ui/CartoonButton'
import { CartoonInput } from '../../../components/ui/CartoonInput'
import { CartoonSelect } from '../../../components/ui/CartoonSelect'
import { CartoonCombobox } from '../../../components/ui/CartoonCombobox'
import {
  fetchAllCountries,
  fetchCitiesForCountry,
  pickRandomCity,
  type CountryItem,
} from '../services/locationService'
import { createBirthJournalEntry, generateParents } from '../services/familyService'
import { createInitialEducation } from '../../education/services/educationService'
import { createInitialCareerState } from '../../career/services/careerService'
import { getRandomName, LAST_NAMES, MALE_NAMES, FEMALE_NAMES, NON_BINARY_NAMES } from '../data/names'
import type { CharacterProfile } from '../../../types/game'
import { createId } from '../../../utils/id'

interface NewLifeScreenProps {
  onStartLife: (character: CharacterProfile) => void;
}

export const NewLifeScreen: React.FC<NewLifeScreenProps> = ({ onStartLife }) => {
  const [gender, setGender] = useState<'male' | 'female' | 'non-binary'>('male')
  const [firstName, setFirstName] = useState('Leo')
  const [lastName, setLastName] = useState('Bennett')

  // Location states
  const [countries, setCountries] = useState<CountryItem[]>([])
  const [selectedCountryName, setSelectedCountryName] = useState<string>('United States')
  const [cities, setCities] = useState<string[]>([])
  const [selectedCityName, setSelectedCityName] = useState<string>('New York')

  // Loading states
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [validationError, setValidationError] = useState('')

  // 1. Fetch all 250 countries on initial mount
  useEffect(() => {
    let isMounted = true;
    async function loadCountries() {
      setIsLoadingCountries(true);
      const data = await fetchAllCountries();
      if (!isMounted) return;
      setCountries(data);
      setIsLoadingCountries(false);

      const initialCountry = data.find((c) => c.name === 'United States') || data[0];
      if (initialCountry) {
        setSelectedCountryName(initialCountry.name);
      }
    }
    loadCountries();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch cities whenever selectedCountryName changes
  useEffect(() => {
    if (!selectedCountryName) return;
    let isMounted = true;

    async function loadCities() {
      setIsLoadingCities(true);
      const cityList = await fetchCitiesForCountry(selectedCountryName);
      if (!isMounted) return;
      setCities(cityList);
      setIsLoadingCities(false);

      // First item in cityList is now guaranteed to be a major city (e.g. New York, Karachi, Tokyo)
      if (cityList.length > 0) {
        setSelectedCityName(cityList[0]);
      } else {
        setSelectedCityName(selectedCountryName);
      }
    }

    loadCities();
    return () => {
      isMounted = false;
    };
  }, [selectedCountryName]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setSelectedCountryName(newCountry);
    setValidationError('');
  };

  const rollFirstName = () => {
    let list = NON_BINARY_NAMES;
    if (gender === 'male') list = MALE_NAMES;
    if (gender === 'female') list = FEMALE_NAMES;
    setFirstName(list[Math.floor(Math.random() * list.length)]);
  };

  const rollLastName = () => {
    setLastName(LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]);
  };

  // Surprise Me (Full Randomize)
  const randomizeAll = async () => {
    const genders: ('male' | 'female' | 'non-binary')[] = ['male', 'female', 'non-binary'];
    const randomGender = genders[Math.floor(Math.random() * genders.length)];
    setGender(randomGender);

    const names = getRandomName(randomGender);
    setFirstName(names.firstName);
    setLastName(names.lastName);

    if (countries.length > 0) {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      setSelectedCountryName(randomCountry.name);

      setIsLoadingCities(true);
      const cityList = await fetchCitiesForCountry(randomCountry.name);
      setCities(cityList);
      setIsLoadingCities(false);

      setSelectedCityName(pickRandomCity(randomCountry.name, cityList));
    }
    setValidationError('');
  };

  const handleGenderChange = (newGender: 'male' | 'female' | 'non-binary') => {
    setGender(newGender);
    let list = NON_BINARY_NAMES;
    if (newGender === 'male') list = MALE_NAMES;
    if (newGender === 'female') list = FEMALE_NAMES;
    setFirstName(list[Math.floor(Math.random() * list.length)]);
  };

  const handleStartLife = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setValidationError('Please enter both a first and family name!');
      return;
    }

    if (!selectedCountryName || !selectedCityName) {
      setValidationError('Please select a valid birthplace!');
      return;
    }

    const birthYear = new Date().getFullYear();
    const parents = generateParents(trimmedLast);
    const birthEntry = createBirthJournalEntry({
      firstName: trimmedFirst,
      lastName: trimmedLast,
      gender,
      city: selectedCityName,
      country: selectedCountryName,
      birthYear,
      parents,
    });

    // Generate balanced initial stats with slight personality variance
    const health = 85 + Math.floor(Math.random() * 16);    // 85 - 100
    const happiness = 80 + Math.floor(Math.random() * 21); // 80 - 100
    const smarts = 40 + Math.floor(Math.random() * 55);    // 40 - 95
    const looks = 40 + Math.floor(Math.random() * 55);     // 40 - 95
    const karma = 100;                                     // pure soul at birth

    const newCharacter: CharacterProfile = {
      id: createId(),
      firstName: trimmedFirst,
      lastName: trimmedLast,
      gender,
      age: 0,
      birthYear,
      country: selectedCountryName,
      flag: currentFlag,
      city: selectedCityName,
      occupation: 'Infant',
      cash: 0,
      bankBalance: 0,
      netWorth: 0,
      isAlive: true,
      stats: {
        health,
        happiness,
        smarts,
        looks,
        karma,
      },
      parents,
      education: createInitialEducation(),
      career: createInitialCareerState(),
      relationships: [],
      seenEventIds: [],
      timeline: [birthEntry],
    };

    onStartLife(newCharacter);
  };

  const currentCountryObj = countries.find((c) => c.name === selectedCountryName);
  const currentFlag = currentCountryObj?.flag || '🌐';

  const countryOptions = countries.map((c) => ({
    value: c.name,
    label: `${c.flag} ${c.name}`,
  }));

  const avatar = gender === 'male' ? '👶' : gender === 'female' ? '👶' : '🍼';
  const avatarRing =
    gender === 'male'
      ? 'bg-sky-100 border-sky-400'
      : gender === 'female'
      ? 'bg-rose-100 border-rose-400'
      : 'bg-amber-100 border-amber-400';

  return (
    <div className="p-5 flex flex-col gap-4 bg-white">
      {/* Avatar Banner */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1">
        <div
          className={`w-20 h-20 rounded-3xl border-[3px] border-slate-900 ${avatarRing} flex items-center justify-center text-4xl shadow-[3px_4px_0_#0f172a] transition-all relative`}
        >
          <span>{avatar}</span>
          <span className="absolute -bottom-1 -right-1 bg-amber-400 border-2 border-slate-900 rounded-xl px-1.5 py-0.5 text-[10px] font-black shadow-[1px_1px_0_#0f172a]">
            Age 0
          </span>
        </div>
        <h2 className="mt-2.5 font-black text-slate-900 text-lg">
          {firstName || 'Baby'} {lastName || 'Newborn'}
        </h2>
        <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
          <span>{currentFlag}</span>
          <span>
            Born in {selectedCityName || '...'}, {selectedCountryName || '...'}
          </span>
        </p>
      </div>

      <form onSubmit={handleStartLife} className="flex flex-col gap-3.5">
        {/* Gender Selection */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-black text-slate-700 px-1">Gender</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleGenderChange('male')}
              className={`
                py-2 px-2 rounded-2xl border-[2.5px] border-slate-900 font-black text-xs flex items-center justify-center gap-1.5 transition-all
                ${
                  gender === 'male'
                    ? 'bg-sky-400 text-slate-950 shadow-[2px_2.5px_0_#0f172a]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-[1px_1px_0_#0f172a]'
                }
              `}
            >
              <span>👦</span> Male
            </button>

            <button
              type="button"
              onClick={() => handleGenderChange('female')}
              className={`
                py-2 px-2 rounded-2xl border-[2.5px] border-slate-900 font-black text-xs flex items-center justify-center gap-1.5 transition-all
                ${
                  gender === 'female'
                    ? 'bg-rose-300 text-slate-950 shadow-[2px_2.5px_0_#0f172a]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-[1px_1px_0_#0f172a]'
                }
              `}
            >
              <span>👧</span> Female
            </button>

            <button
              type="button"
              onClick={() => handleGenderChange('non-binary')}
              className={`
                py-2 px-2 rounded-2xl border-[2.5px] border-slate-900 font-black text-xs flex items-center justify-center gap-1.5 transition-all
                ${
                  gender === 'non-binary'
                    ? 'bg-purple-300 text-slate-950 shadow-[2px_2.5px_0_#0f172a]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 shadow-[1px_1px_0_#0f172a]'
                }
              `}
            >
              <span>🧑</span> Other
            </button>
          </div>
        </div>

        {/* First & Family Name Inputs */}
        <div className="grid grid-cols-2 gap-2.5">
          <CartoonInput
            label="First Name"
            icon={<User className="w-3.5 h-3.5" />}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onRandomize={rollFirstName}
            placeholder="e.g. Leo"
            maxLength={20}
            required
          />

          <CartoonInput
            label="Family Name"
            icon={<User className="w-3.5 h-3.5" />}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onRandomize={rollLastName}
            placeholder="e.g. Bennett"
            maxLength={20}
            required
          />
        </div>

        {/* Country & Searchable Dependent City Selectors */}
        <div className="flex flex-col gap-3">
          <CartoonSelect
            label="Birthplace Country"
            icon={<Globe className="w-3.5 h-3.5" />}
            value={selectedCountryName}
            onChange={handleCountryChange}
            options={countryOptions}
            isLoading={isLoadingCountries}
            placeholder="Select a country..."
          />

          <CartoonCombobox
            label="Birthplace City"
            icon={<MapPin className="w-3.5 h-3.5" />}
            value={selectedCityName}
            options={cities}
            onChange={(city) => setSelectedCityName(city)}
            disabled={!selectedCountryName || isLoadingCities}
            isLoading={isLoadingCities}
            placeholder={
              !selectedCountryName ? 'Select a country first...' : 'Select a city...'
            }
            searchPlaceholder="Search any city..."
          />
        </div>

        {/* Error message if any */}
        {validationError && (
          <p className="text-xs font-black text-rose-600 bg-rose-50 border-2 border-rose-300 rounded-xl p-2 text-center">
            {validationError}
          </p>
        )}

        {/* Surprise Me button */}
        <button
          type="button"
          onClick={randomizeAll}
          disabled={isLoadingCountries || isLoadingCities}
          className="text-xs font-black text-slate-700 hover:text-slate-950 bg-amber-100 hover:bg-amber-200 border-2 border-amber-900/30 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Dices className="w-4 h-4 stroke-[2.5]" />
          Surprise Me
        </button>

        {/* Primary Action Button */}
        <div className="pt-2">
          <CartoonButton
            type="submit"
            variant="emerald"
            size="lg"
            fullWidth
            disabled={isLoadingCountries || isLoadingCities}
            icon={<Rocket className="w-5 h-5 stroke-[2.5]" />}
          >
            START A NEW LIFE!
          </CartoonButton>
        </div>
      </form>
    </div>
  );
};
