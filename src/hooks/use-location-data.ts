"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchStates } from "@/utils/api/states/fetch";
import { fetchCities } from "@/utils/api/city/fetch";
import { fetchCountries } from "@/utils/api/countries/fetch";
import { CityData } from "@/types/cities";
import { ProvinceData } from "@/types/provinces";
import { CountryData } from "@/types/countries";

export function useLocationData() {
  const [states, setStates] = useState<ProvinceData[]>([]);
  const [cities, setCities] = useState<CityData[]>([]);
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [openState, setOpenState] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const [openCountry, setOpenCountry] = useState(false);
  const [currentState, setCurrentState] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });
  const [currentCity, setCurrentCity] = useState<{
    id: number;
    name: string;
    timezone: string;
  }>({
    id: 0,
    name: "",
    timezone: "",
  });
  const [currentCountry, setCurrentCountry] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });
  const [selectedState, setSelectedState] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });
  const [selectedCity, setSelectedCity] = useState<{
    id: number;
    name: string;
    timezone: string;
  }>({ id: 0, name: "", timezone: "" });
  const [selectedCountry, setSelectedCountry] = useState<{
    id: number;
    name: string;
  }>({ id: 0, name: "" });

  const loadStates = useCallback(async () => {
    const countryId =
      selectedCountry.id !== 0 ? selectedCountry.id : currentCountry.id;
    const result = await fetchStates(countryId);
    if (result.success) {
      setStates(result.data || []);
      setSelectedState({ id: 0, name: "" });
      setCities([]);
    }
  }, [selectedCountry.id, currentCountry.id]);

  const loadCities = useCallback(async () => {
    const stateId = selectedState.id ? selectedState.id : currentState.id;

    try {
      const result = await fetchCities(stateId);
      if (result.success) {
        setCities(result.data || []);
        setSelectedCity({ id: 0, name: "", timezone: "" });
      }
    } catch (error) {
      console.error("Error loading cities:", error);
      setCities([]);
    }
  }, [selectedState.id, currentState.id]);

  const loadCountries = useCallback(async () => {
    const result = await fetchCountries();
    if (result.success) {
      setCountries(result.data || []);
    }
  }, []);

  // Load countries on mount
  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // Load states when country changes
  useEffect(() => {
    loadStates();
  }, [loadStates]);

  // Load states when selectedCountry changes
  useEffect(() => {
    if (selectedCountry.id !== 0) {
      loadStates();
      setSelectedState({ id: 0, name: "" });
      setSelectedCity({ id: 0, name: "", timezone: "" });
      setCities([]);
    }
  }, [selectedCountry.id, loadStates]);

  // Load cities when selectedState changes
  useEffect(() => {
    if (selectedState.id !== 0) {
      loadCities();
    }
  }, [selectedState.id, loadCities]);

  // Load initial cities based on currentState
  useEffect(() => {
    if (currentState.id !== 0 && cities.length === 0) {
      const loadInitialCities = async () => {
        try {
          const result = await fetchCities(currentState.id);
          if (result.success) {
            setCities(result.data || []);
          }
        } catch (error) {
          console.error("Error loading initial cities:", error);
        }
      };
      loadInitialCities();
    }
  }, [currentState.id, cities.length]);

  // Update city name after cities are loaded
  useEffect(() => {
    if (currentCity.id !== 0 && currentCity.name === "" && cities.length > 0) {
      const cityName =
        cities.find((city) => city.id === currentCity.id)?.name || "";
      if (cityName) {
        setCurrentCity((prev) => ({ ...prev, name: cityName }));
      }
    }
  }, [currentCity.id, currentCity.name, cities]);

  return {
    states,
    cities,
    countries,
    openState,
    setOpenState,
    openCity,
    setOpenCity,
    openCountry,
    setOpenCountry,
    currentState,
    setCurrentState,
    currentCity,
    setCurrentCity,
    currentCountry,
    setCurrentCountry,
    selectedState,
    setSelectedState,
    selectedCity,
    setSelectedCity,
    selectedCountry,
    setSelectedCountry,
  };
}
