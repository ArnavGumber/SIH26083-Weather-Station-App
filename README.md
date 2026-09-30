# SIH26083 --- Extreme Heatwave Early Warning & Human Thermal Stress Index

> A hyperlocal heat-health intelligence and decision-support system for
> ward-level heat risk assessment, visualization, and alerts.

## Overview

**SIH26083** is a Smart India Hackathon project focused on improving
extreme-heat early warning by going beyond ambient temperature alone.

The system combines:

-   Temperature
-   Relative humidity
-   Wind speed
-   Solar radiation
-   Mean radiant temperature (MRT)

with:

-   **Heat Index (HI)**
-   **Wet Bulb Globe Temperature (WBGT)**
-   **Universal Thermal Climate Index (UTCI)**

Thermal information is combined with heat exposure/duration and
ward-level vulnerability factors to generate a **relative heat-health
risk indicator**.

The platform presents results through a GIS-based dashboard and can
trigger alerts through an SMS gateway.

------------------------------------------------------------------------

## Problem

Ambient temperature alone does not fully describe the thermal stress
experienced by people.

Two locations with the same air temperature can experience different
human thermal stress because of differences in humidity, wind, solar
radiation, radiant environment, heat duration, and population
vulnerability.

The project therefore follows:

``` text
Environmental Conditions
        ↓
Human Thermal Stress
        ↓
Ward-Level Vulnerability
        ↓
Relative Heat-Health Risk
        ↓
Actionable Alerts
```

------------------------------------------------------------------------

## Our Approach

The system acts as a **hyperlocal heat-health intelligence layer** over
existing meteorological and health information.

``` text
Weather / Local Sensor Data
            ↓
     Data Processing
            ↓
  ┌─────────────────────┐
  │ Thermal Engine      │
  │ HI + WBGT + UTCI    │
  │ + MRT               │
  └──────────┬──────────┘
             ↓
      Risk Assessment
             ↓
   Ward Vulnerability
   + Heat Duration
             ↓
   Relative Heat-Health
          Risk
             ↓
   ┌─────────┴──────────┐
   ↓                    ↓
GIS Dashboard       Alert Engine
                        ↓
                 SMS / Notifications
```

------------------------------------------------------------------------

## Key Features

### Multi-dimensional thermal assessment

Uses temperature, humidity, wind, radiation and MRT rather than
temperature alone.

### Heat Index

Represents apparent heat using air temperature and relative humidity.

### WBGT

Uses environmental parameters including temperature, humidity, wind and
radiation for outdoor heat-stress assessment.

### UTCI

Represents outdoor physiological thermal stress using air temperature,
humidity, wind and mean radiant temperature.

### Ward-level GIS

Chandigarh ward/sector boundaries are visualized and associated with
dynamic environmental and risk data.

### Vulnerability-aware risk

The prototype can incorporate elderly population, outdoor workers,
children, green cover, shade, cooling access, healthcare access and
built-up environment.

### Heat-duration awareness

Prolonged heat exposure can be incorporated into risk assessment.

### Alerts

The backend can trigger SMS alerts through an Android phone running
Traccar SMS Gateway.

------------------------------------------------------------------------

## System Architecture

``` text
┌──────────────────────┐
│ Weather / Sensors    │
│ T, RH, Wind, Solar   │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Node.js / Express    │
│ Backend              │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Thermal Engine       │
│ HI / WBGT / MRT      │
│ UTCI                 │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Risk Engine          │
│ Thermal Risk         │
│ Vulnerability        │
│ Heat Duration        │
└──────────┬───────────┘
           ├───────────────┐
           ↓               ↓
┌──────────────────┐  ┌──────────────────┐
│ Database         │  │ Alert Engine     │
│ Weather          │  │ SMS / Actions    │
│ Indices          │  └────────┬─────────┘
│ Risk History     │           ↓
│ Alerts            │  Traccar SMS Gateway
└────────┬─────────┘           ↓
         ↓                     SMS
┌──────────────────────┐
│ Frontend Dashboard   │
│ GIS + Risk + Alerts  │
└──────────────────────┘
```

------------------------------------------------------------------------

## Technology Stack

### Frontend

-   HTML
-   CSS
-   JavaScript
-   Leaflet.js
-   GIS / GeoJSON

### Backend

-   Node.js
-   Express.js
-   REST APIs

### Data & Storage

-   Firestore / database layer
-   JSON-based prototype data
-   GeoJSON geographical boundaries

### Thermal & Risk Models

-   Heat Index
-   Liljegren-based outdoor WBGT approach
-   UTCI
-   Mean Radiant Temperature
-   Ward vulnerability model
-   Relative heat-health risk model

### Alerting

-   Traccar SMS Gateway
-   Android phone
-   SIM/mobile network
-   HTTP API

------------------------------------------------------------------------

## Frontend ↔ Backend Flow

``` text
Frontend
   │
   │ HTTP request
   ↓
Node.js + Express
   ├── Get weather/risk data
   ├── Calculate/process risk
   ├── Store/retrieve data
   └── Trigger alerts
   ↓
Frontend
```

### SMS Flow

``` text
Risk Engine
     ↓
POST /api/send-sms
     ↓
Node.js Backend
     ↓
sendSMS()
     ↓
Traccar HTTP API
     ↓
Android Phone
     ↓
SIM Network
     ↓
SMS Recipient
```

------------------------------------------------------------------------

## Example SMS Endpoint

``` http
POST /api/send-sms
Content-Type: application/json
```

``` json
{
  "to": "+91XXXXXXXXXX",
  "message": "CRITICAL HEAT ALERT: CHD-WARD-18 has entered extreme heat risk."
}
```

The backend forwards the request to the Android Traccar SMS Gateway.

------------------------------------------------------------------------

## Risk Assessment

The project separates **thermal hazard** from **population
vulnerability**.

``` text
Thermal Hazard
      +
Exposure / Duration
      +
Ward Vulnerability
      ↓
Relative Heat-Health Risk
```

The prototype output is a **relative risk indicator**, not a probability
of death.

Mortality-related coefficients require validation and calibration
against appropriate local historical health and mortality data before
operational deployment.

------------------------------------------------------------------------

## Geographic Data

The dashboard uses Chandigarh sector/ward boundaries through GeoJSON.

Example dynamic ward data:

``` json
{
  "wardNumber": 18,
  "temperature": 36.2,
  "humidity": 65,
  "windSpeed": 1.0,
  "solarRadiation": 670,
  "wbgt": 31.8,
  "utci": 39.4,
  "riskScore": 82
}
```

Geographical geometry and dynamic environmental/risk values are kept as
separate concerns.

------------------------------------------------------------------------

## Current Prototype Status

This project is being developed as a **Smart India Hackathon
internal-round prototype**.

### Implemented / explored

-   [x] Chandigarh ward/sector GIS visualization
-   [x] Environmental data simulation
-   [x] Temperature, humidity, wind and solar-radiation data flow
-   [x] Heat Index calculation
-   [x] WBGT calculation
-   [x] MRT / UTCI pipeline
-   [x] Node.js backend architecture
-   [x] Ward-level risk concept
-   [x] Vulnerability-aware risk model
-   [x] SMS alert architecture
-   [x] Traccar SMS Gateway integration approach

### In development

-   [ ] Complete database integration
-   [ ] Historical risk/trend visualization
-   [ ] Production-quality forecast integration
-   [ ] Local validation and calibration
-   [ ] Expanded vulnerability datasets
-   [ ] Health-outcome feedback loop
-   [ ] Robust alert management

------------------------------------------------------------------------

## Future Scope

### Government data integration

Integrate appropriate official meteorological and health datasets.

### Local calibration

Use Chandigarh-specific historical data to calibrate thermal-risk
thresholds and health-impact relationships.

### 3--5 day ward-level forecasting

Generate localized heat-health risk forecasts.

### Health-outcome feedback

``` text
Prediction
    ↓
Alert
    ↓
Observed HRI / Hospital Data
    ↓
Model Evaluation
    ↓
Calibration
    ↓
Improved Prediction
```

### Multilingual advisories

Generate localized public-health advisories for different user groups
and languages.

### Automated response workflows

Connect risk events to relevant administrative actions and notification
systems.

------------------------------------------------------------------------

## Project Vision

The goal is not to replace existing meteorological or disaster-warning
infrastructure.

The vision is to build a **hyperlocal heat-health intelligence layer**
that transforms environmental data into:

``` text
MEASURE
   ↓
UNDERSTAND
   ↓
ASSESS
   ↓
EXPLAIN
   ↓
ACT
```

**From measuring heat to understanding human risk.**

------------------------------------------------------------------------

## Project Information

  -----------------------------------------------------------------------
  Field                               Details
  ----------------------------------- -----------------------------------
  Problem Statement                   SIH26083

  Title                               Extreme Heatwave Early Warning and
                                      Human Thermal Stress Index

  Organization                        Ministry of Earth Sciences (MoES)

  Department                          NCMRWF

  Category                            Software

  Theme                               Disaster Management

  Prototype Focus                     Chandigarh, India
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Disclaimer

This repository contains a hackathon prototype and research
implementation. It is not an operational government warning system,
medical device, or public emergency service.

Risk outputs should not be used for medical or emergency decisions
without appropriate validation, expert review, and official data
integration.

Demo/simulated weather values must not be interpreted as official
measurements or forecasts.
