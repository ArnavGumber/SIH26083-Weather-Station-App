function estimateMRT(temperature, solarRadiation) {
    const sigma = 5.670374419e-8; // Stefan-Boltzmann constant
    const emissivity = 0.95;
    const solarAbsorptivity = 0.70;

    const TaK = temperature + 273.15;

    /*
        Simplified spherical radiation approximation.

        Solar radiation:
            W/m²

        Result:
            Mean radiant temperature in °C

        IMPORTANT:
        This is an approximation for prototype/demo purposes.
        A production system should use a proper MRT radiation model.
    */

    const radiantEnergy =
        (solarAbsorptivity * solarRadiation) /
        (4 * emissivity);

    const TmrtK = Math.pow(
        Math.pow(TaK, 4) + radiantEnergy / sigma,
        0.25
    );

    return TmrtK - 273.15;
}

function calculateUTCI(
    temperature,
    humidity,
    windSpeed,
    solarRadiation
) {
    // -----------------------------------------
    // 1. Validate input
    // -----------------------------------------

    if (
        !Number.isFinite(temperature) ||
        !Number.isFinite(humidity) ||
        !Number.isFinite(windSpeed) ||
        !Number.isFinite(solarRadiation)
    ) {
        throw new Error("Invalid UTCI input");
    }

    if (temperature <= -50 || temperature >= 50) {
        throw new Error("Temperature outside UTCI range");
    }

    if (humidity < 0 || humidity > 100) {
        throw new Error("Humidity must be between 0 and 100%");
    }

    /*
        UTCI requires wind speed at 10 m.

        If your sensor/data source already provides 10 m wind,
        use it directly.

        If it is 2 m wind, approximately:
            V10 ≈ V2 × 1.5

        Do NOT blindly apply this conversion if your source
        already reports 10 m wind.
    */

    const v = windSpeed;

    if (v <= 0.5 || v >= 17) {
        throw new Error(
            "Wind speed must be between 0.5 and 17 m/s for UTCI"
        );
    }

    // -----------------------------------------
    // 2. Estimate Mean Radiant Temperature
    // -----------------------------------------

    const tmrt = estimateMRT(
        temperature,
        solarRadiation
    );

    // UTCI applicability condition
    if (
        tmrt <= temperature - 30 ||
        tmrt >= temperature + 70
    ) {
        throw new Error("MRT outside UTCI applicability range");
    }

    // -----------------------------------------
    // 3. Calculate water vapour pressure
    // -----------------------------------------

    const tk = temperature + 273.15;

    const g = [
        -2836.5744,
        -6028.076559,
        19.54263612,
        -0.02737830188,
        0.000016261698,
        7.0229056e-10,
        -1.8680009e-13
    ];

    let es = 2.7150305 * Math.log(tk);

    for (let i = 0; i < g.length; i++) {
        es += g[i] * Math.pow(tk, i - 2);
    }

    // Saturation vapour pressure [hPa]
    es = Math.exp(es) * 0.01;

    // Actual vapour pressure [hPa]
    const ehPa = es * (humidity / 100);

    // Vapour pressure [kPa]
    const pa = ehPa / 10;

    // -----------------------------------------
    // 4. MRT difference
    // -----------------------------------------

    const dtmrt = tmrt - temperature;

    // -----------------------------------------
    // 5. Powers
    // -----------------------------------------

    const ta = temperature;
    const va = v;
    const dt = dtmrt;
    const p = pa;

    const ta2 = ta ** 2;
    const ta3 = ta ** 3;
    const ta4 = ta ** 4;
    const ta5 = ta ** 5;
    const ta6 = ta ** 6;

    const v2 = va ** 2;
    const v3 = va ** 3;
    const v4 = va ** 4;
    const v5 = va ** 5;
    const v6 = va ** 6;

    const dt2 = dt ** 2;
    const dt3 = dt ** 3;
    const dt4 = dt ** 4;
    const dt5 = dt ** 5;
    const dt6 = dt ** 6;

    const p2 = p ** 2;
    const p3 = p ** 3;
    const p4 = p ** 4;
    const p5 = p ** 5;
    const p6 = p ** 6;

    // -----------------------------------------
    // 6. UTCI polynomial
    // -----------------------------------------

    let utci = ta;

    // Temperature terms
    utci +=
        0.607562052
        - 0.0227712343 * ta
        + 8.06470249e-4 * ta2
        - 1.54271372e-4 * ta3
        - 3.24651735e-6 * ta4
        + 7.32602852e-8 * ta5
        + 1.35959073e-9 * ta6;

    // Wind terms
    utci +=
        -2.25836520 * va
        + 0.0880326035 * ta * va
        + 0.00216844454 * ta2 * va
        - 1.53347087e-5 * ta3 * va
        - 5.72983704e-7 * ta4 * va
        - 2.55090145e-9 * ta5 * va

        - 0.751269505 * v2
        - 0.00408350271 * ta * v2
        - 5.21670675e-5 * ta2 * v2
        + 1.94544667e-6 * ta3 * v2
        + 1.14099531e-8 * ta4 * v2

        + 0.158137256 * v3
        - 6.57263143e-5 * ta * v3
        + 2.22697524e-7 * ta2 * v3
        - 4.16117031e-8 * ta3 * v3

        - 0.0127762753 * v4
        + 9.66891875e-6 * ta * v4
        + 2.52785852e-9 * ta2 * v4

        + 4.56306672e-4 * v5
        - 1.74202546e-7 * ta * v5
        - 5.91491269e-6 * v6;

    // MRT terms
    utci +=
        0.398374029 * dt
        + 1.83945314e-4 * ta * dt
        - 1.73754510e-4 * ta2 * dt
        - 7.60781159e-7 * ta3 * dt
        + 3.77830287e-8 * ta4 * dt
        + 5.43079673e-10 * ta5 * dt

        - 0.0200518269 * va * dt
        + 8.92859837e-4 * ta * va * dt
        + 3.45433048e-6 * ta2 * va * dt
        - 3.77925774e-7 * ta3 * va * dt
        - 1.69699377e-9 * ta4 * va * dt

        + 1.69992415e-4 * v2 * dt
        - 4.99204314e-5 * ta * v2 * dt
        + 2.47417178e-7 * ta2 * v2 * dt
        + 1.07596466e-8 * ta3 * v2 * dt

        + 8.49242932e-5 * v3 * dt
        + 1.35191328e-6 * ta * v3 * dt
        - 6.21531254e-9 * ta2 * v3 * dt

        - 4.99410301e-6 * v4 * dt
        - 1.89489258e-8 * ta * v4 * dt
        + 8.15300114e-8 * v5 * dt;

    // MRT²
    utci +=
        7.55043090e-4 * dt2
        - 5.65095215e-5 * ta * dt2
        - 4.52166564e-7 * ta2 * dt2
        + 2.46688878e-8 * ta3 * dt2
        + 2.42674348e-10 * ta4 * dt2

        + 1.54547250e-4 * va * dt2
        + 5.24110970e-6 * ta * va * dt2
        - 8.75874982e-8 * ta2 * va * dt2
        - 1.50743064e-9 * ta3 * va * dt2

        - 1.56236307e-5 * v2 * dt2
        - 1.33895614e-7 * ta * v2 * dt2
        + 2.49709824e-9 * ta2 * v2 * dt2
        + 6.51711721e-7 * v3 * dt2
        + 1.94960053e-9 * ta * v3 * dt2
        - 1.00361113e-8 * v4 * dt2;

    // MRT³
    utci +=
        -1.21206673e-5 * dt3
        -2.18203660e-7 * ta * dt3
        +7.51269482e-9 * ta2 * dt3
        +9.79063848e-11 * ta3 * dt3

        +1.25006734e-6 * va * dt3
        -1.81584736e-9 * ta * va * dt3
        -3.52197671e-10 * ta2 * va * dt3
        -3.36514630e-8 * v2 * dt3
        +1.35908359e-10 * ta * v2 * dt3
        +4.17032620e-10 * v3 * dt3;

    // MRT⁴ and MRT⁵
    utci +=
        -1.30369025e-9 * dt4
        +4.13908461e-10 * ta * dt4
        +9.22652254e-12 * ta2 * dt4
        -5.08220384e-9 * va * dt4
        -2.24730961e-11 * ta * va * dt4
        +1.17139133e-10 * v2 * dt4

        +6.62154879e-10 * dt5
        +4.03863260e-13 * ta * dt5
        +1.95087203e-12 * va * dt5
        -4.73602469e-12 * dt6;

    // Vapour pressure terms
    utci +=
        5.12733497 * p
        - 0.312788561 * ta * p
        - 0.0196701861 * ta2 * p
        + 9.99690870e-4 * ta3 * p
        + 9.51738512e-6 * ta4 * p
        - 4.66426341e-7 * ta5 * p

        + 0.548050612 * va * p
        - 0.00330552823 * ta * va * p
        - 0.00164119440 * ta2 * va * p
        - 5.16670694e-6 * ta3 * va * p
        + 9.52692432e-7 * ta4 * va * p

        - 0.0429223622 * v2 * p
        + 0.00500845667 * ta * v2 * p
        + 1.00601257e-6 * ta2 * v2 * p
        - 1.81748644e-6 * ta3 * v2 * p

        - 1.25813502e-3 * v3 * p
        - 1.79330391e-4 * ta * v3 * p
        + 2.34994441e-6 * ta2 * v3 * p

        + 1.29735808e-4 * v4 * p
        + 1.29064870e-6 * ta * v4 * p
        - 2.28558686e-6 * v5 * p;

    // Higher-order vapour pressure terms
    utci +=
        -2.80626406 * p2
        +0.548712484 * ta * p2
        -0.00399428410 * ta2 * p2
        -9.54009191e-4 * ta3 * p2
        +1.93090978e-5 * ta4 * p2

        -0.308806365 * va * p2
        +0.0116952364 * ta * va * p2
        +4.95271903e-4 * ta2 * va * p2
        -1.90710882e-5 * ta3 * va * p2

        +0.00210787756 * v2 * p2
        -6.98445738e-4 * ta * v2 * p2
        +2.30109073e-5 * ta2 * v2 * p2
        +4.17856590e-4 * v3 * p2
        -1.27043871e-5 * ta * v3 * p2
        -3.04620472e-6 * v4 * p2;

    utci +=
        -0.0353874123 * p3
        -0.221201190 * ta * p3
        +0.0155126038 * ta2 * p3
        -2.63917279e-4 * ta3 * p3

        +0.0453433455 * va * p3
        -0.00432943862 * ta * va * p3
        +1.45389826e-4 * ta2 * va * p3

        +2.17508610e-4 * v2 * p3
        -6.66724702e-5 * ta * v2 * p3
        +3.33217140e-5 * v3 * p3;

    utci +=
        0.614155345 * p4
        -0.0616755931 * ta * p4
        +0.00133374846 * ta2 * p4
        +0.00355375387 * va * p4
        -5.13027851e-4 * ta * va * p4
        +1.02449757e-4 * v2 * p4

        -0.00148526421 * dt * p4
        -4.11469183e-5 * ta * dt * p4
        -6.80434415e-6 * va * dt * p4
        -9.77675906e-6 * dt2 * p4;

    utci +=
        0.0882773108 * p5
        -0.00301859306 * ta * p5
        +0.00104452989 * va * p5
        +2.47090539e-4 * dt * p5
        +0.00148348065 * p6;

    // -----------------------------------------
    // 7. Stress category
    // -----------------------------------------

    let stressCategory;

    if (utci < -40) {
        stressCategory = "Extreme cold stress";
    } else if (utci < -27) {
        stressCategory = "Very strong cold stress";
    } else if (utci < -13) {
        stressCategory = "Strong cold stress";
    } else if (utci < 0) {
        stressCategory = "Moderate cold stress";
    } else if (utci < 9) {
        stressCategory = "Slight cold stress";
    } else if (utci < 26) {
        stressCategory = "No thermal stress";
    } else if (utci < 32) {
        stressCategory = "Moderate heat stress";
    } else if (utci < 38) {
        stressCategory = "Strong heat stress";
    } else if (utci < 46) {
        stressCategory = "Very strong heat stress";
    } else {
        stressCategory = "Extreme heat stress";
    }

    return {
        utci: Number(utci.toFixed(1)),
        mrt: Number(tmrt.toFixed(1)),
        vaporPressure: Number(pa.toFixed(3)),
        stressCategory
    };
}

module.exports = {
    calculateUTCI
}