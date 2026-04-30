// src/constants/locations.js — Country → State → City tree.
//
// Lightweight static dataset focused on India (the primary market) plus
// a handful of common international countries with key cities. The shape:
//   COUNTRIES = [{ id, label }]
//   STATES_BY_COUNTRY[countryId] = [{ id, label }]
//   CITIES_BY_STATE[stateId]     = [{ id, label }]
//
// Helpers:
//   getStates(countryId)         → state list (or [])
//   getCities(stateId)           → city list (or [])
//
// Add more countries / states / cities as needed.

export const COUNTRIES = [
  { id: 'IN', label: 'India' },
  { id: 'US', label: 'United States' },
  { id: 'GB', label: 'United Kingdom' },
  { id: 'AE', label: 'United Arab Emirates' },
  { id: 'SG', label: 'Singapore' },
  { id: 'AU', label: 'Australia' },
];

// Indian states + UTs (alphabetical).
const IN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const stateId = (country, name) => `${country}-${name.replace(/[^A-Za-z0-9]+/g, '_')}`;
const cityId = (sId, name) => `${sId}::${name.replace(/[^A-Za-z0-9]+/g, '_')}`;

const buildStateList = (country, names) =>
  names.map((name) => ({ id: stateId(country, name), label: name }));

const buildCityMap = (country, mapping) => {
  const out = {};
  Object.entries(mapping).forEach(([state, cities]) => {
    const sId = stateId(country, state);
    out[sId] = cities.map((name) => ({ id: cityId(sId, name), label: name }));
  });
  return out;
};

// Major Indian cities per state (covers the largest population centres;
// extend as needed).
const IN_CITY_MAP = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh'],
  'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Karnal', 'Rohtak', 'Hisar'],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Manali', 'Solan', 'Mandi'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Davanagere', 'Ballari', 'Tumakuru'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Kannur'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Amravati'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Bhilwara'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Allahabad', 'Noida', 'Bareilly', 'Aligarh'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
  'Chandigarh': ['Chandigarh'],
  'Puducherry': ['Puducherry', 'Karaikal'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag'],
  'Ladakh': ['Leh', 'Kargil'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Silvassa', 'Diu'],
  'Lakshadweep': ['Kavaratti'],
};

// US — top states + their major cities.
const US_STATES = [
  'California', 'New York', 'Texas', 'Florida', 'Illinois',
  'Washington', 'Massachusetts', 'Georgia', 'Pennsylvania', 'Arizona',
];
const US_CITY_MAP = {
  'California':    ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
  'New York':      ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany'],
  'Texas':         ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  'Florida':       ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee'],
  'Illinois':      ['Chicago', 'Aurora', 'Naperville', 'Springfield'],
  'Washington':    ['Seattle', 'Spokane', 'Tacoma', 'Bellevue'],
  'Massachusetts': ['Boston', 'Worcester', 'Springfield', 'Cambridge'],
  'Georgia':       ['Atlanta', 'Augusta', 'Savannah'],
  'Pennsylvania':  ['Philadelphia', 'Pittsburgh', 'Allentown'],
  'Arizona':       ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale'],
};

// UK — countries + capitals/major cities.
const GB_STATES = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
const GB_CITY_MAP = {
  'England':         ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Bristol', 'Sheffield'],
  'Scotland':        ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
  'Wales':           ['Cardiff', 'Swansea', 'Newport'],
  'Northern Ireland': ['Belfast', 'Londonderry'],
};

// UAE
const AE_STATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
const AE_CITY_MAP = {
  'Abu Dhabi':       ['Abu Dhabi City', 'Al Ain'],
  'Dubai':           ['Dubai City'],
  'Sharjah':         ['Sharjah City'],
  'Ajman':           ['Ajman City'],
  'Umm Al Quwain':   ['Umm Al Quwain City'],
  'Ras Al Khaimah':  ['Ras Al Khaimah City'],
  'Fujairah':        ['Fujairah City'],
};

// Singapore is a city-state — single region with several districts.
const SG_STATES = ['Singapore'];
const SG_CITY_MAP = { 'Singapore': ['Central', 'East', 'North', 'North-East', 'West'] };

// Australia
const AU_STATES = [
  'New South Wales', 'Victoria', 'Queensland', 'Western Australia',
  'South Australia', 'Tasmania', 'Australian Capital Territory', 'Northern Territory',
];
const AU_CITY_MAP = {
  'New South Wales':              ['Sydney', 'Newcastle', 'Wollongong'],
  'Victoria':                     ['Melbourne', 'Geelong', 'Ballarat'],
  'Queensland':                   ['Brisbane', 'Gold Coast', 'Cairns', 'Townsville'],
  'Western Australia':            ['Perth', 'Fremantle'],
  'South Australia':              ['Adelaide'],
  'Tasmania':                     ['Hobart', 'Launceston'],
  'Australian Capital Territory': ['Canberra'],
  'Northern Territory':           ['Darwin', 'Alice Springs'],
};

export const STATES_BY_COUNTRY = {
  IN: buildStateList('IN', IN_STATES),
  US: buildStateList('US', US_STATES),
  GB: buildStateList('GB', GB_STATES),
  AE: buildStateList('AE', AE_STATES),
  SG: buildStateList('SG', SG_STATES),
  AU: buildStateList('AU', AU_STATES),
};

export const CITIES_BY_STATE = {
  ...buildCityMap('IN', IN_CITY_MAP),
  ...buildCityMap('US', US_CITY_MAP),
  ...buildCityMap('GB', GB_CITY_MAP),
  ...buildCityMap('AE', AE_CITY_MAP),
  ...buildCityMap('SG', SG_CITY_MAP),
  ...buildCityMap('AU', AU_CITY_MAP),
};

export const getStates = (countryId) => STATES_BY_COUNTRY[countryId] || [];
export const getCities = (stateValueId) => CITIES_BY_STATE[stateValueId] || [];
