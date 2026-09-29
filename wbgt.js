/**
 * ============================================================
 * Outdoor WBGT - Liljegren et al. (2008)
 * JavaScript implementation
 * ============================================================
 *
 * Based on:
 * Liljegren, J.C., Carhart, R.A., Lawday, P., Tschopp, S.
 * and Sharp, R. (2008)
 *
 * "Modeling the Wet Bulb Globe Temperature Using Standard
 * Meteorological Measurements"
 *
 * Original software:
 * UChicago Argonne, LLC / James C. Liljegren
 *
 * Original implementation:
 * https://github.com/mdljts/wbgt
 *
 * IMPORTANT:
 * This implementation is intended for OUTDOOR WBGT.
 *
 * Inputs:
 *
 * temperature       : °C
 * humidity          : %
 * windSpeed         : m/s
 * windSpeedHeight   : m
 * solarRadiation    : W/m²
 * pressure          : hPa / mbar
 * latitude          : degrees
 * longitude         : degrees
 * timestamp         : ISO timestamp or Date
 *
 * Optional:
 *
 * averageMinutes    : averaging period in minutes
 * urban             : true/false
 * temperatureDiff   : T(30m)-T(2m) or T(10m)-T(2m), °C
 *
 * Recommended weather input:
 *
 * {
 *   temperature: 41.5,
 *   humidity: 61.97,
 *   windSpeed: 3.31,
 *   windSpeedHeight: 10,
 *   solarRadiation: 850,
 *   pressure: 1013.25,
 *   latitude: 30.73,
 *   longitude: 76.78,
 *   timestamp: "2026-09-04T14:00:00+05:30"
 * }
 *
 * ============================================================
 */


// ============================================================
// CONSTANTS
// ============================================================

const PI = Math.PI;

const DEG_RAD =
    Math.PI / 180.0;

const RAD_DEG =
    180.0 / Math.PI;

const TWOPI =
    2.0 * Math.PI;

const SOLAR_CONST = 1367.0;

const GRAVITY = 9.807;

const STEFANB = 5.6696e-8;

const Cp = 1003.5;

const M_AIR = 28.97;

const M_H2O = 18.015;

const RATIO =
    Cp * M_AIR / M_H2O;

const R_GAS = 8314.34;

const R_AIR =
    R_GAS / M_AIR;

const Pr =
    Cp / (Cp + 1.25 * R_AIR);


// Natural wet-bulb wick
const EMIS_WICK = 0.95;

const ALB_WICK = 0.40;

const D_WICK = 0.007;

const L_WICK = 0.0254;


// Globe
const EMIS_GLOBE = 0.95;

const ALB_GLOBE = 0.05;

const D_GLOBE = 0.0508;


// Surface
const EMIS_SFC = 0.999;

const ALB_SFC = 0.45;


// Computational limits
const CZA_MIN = 0.00873;

const NORMSOLAR_MAX = 0.85;

const REF_HEIGHT = 2.0;

const MIN_SPEED = 0.13;

const CONVERGENCE = 0.02;

const MAX_ITER = 50;


// ============================================================
// HELPERS
// ============================================================

function max(a, b) {
    return a > b ? a : b;
}

function min(a, b) {
    return a < b ? a : b;
}

function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
}


// C's modf-like behavior for positive values.
// We only need the fractional part here.
function fractionalPart(x) {
    return x - Math.trunc(x);
}


// ============================================================
// DAY NUMBER
// ============================================================

function daynum(year, month, day) {

    const begmonth = [
        0,
        0,
        31,
        59,
        90,
        120,
        151,
        181,
        212,
        243,
        273,
        304,
        334
    ];

    let leap = 0;

    if (year < 1) {
        return -1;
    }

    if (
        (year % 4 === 0 && year % 100 !== 0) ||
        year % 400 === 0
    ) {
        leap = 1;
    }

    let dnum =
        begmonth[month] + day;

    if (leap && month > 2) {
        dnum += 1;
    }

    return dnum;
}


// ============================================================
// SOLAR POSITION
// ============================================================
//
// Port of the solarposition() routine used by the original
// Liljegren implementation.
//
// Input:
//   year
//   month
//   dayFraction
//       e.g. September 4, 14:30 UTC
//
// Returns:
//   altitude
//   azimuth
//   distance (AU)
// ============================================================

function solarPosition(
    year,
    month,
    dayFraction,
    latitude,
    longitude
) {

    if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error(
            "Invalid latitude or longitude."
        );
    }

    if (
        year < 1950 ||
        year > 2049
    ) {
        throw new Error(
            "Liljegren solar-position implementation supports years 1950-2049."
        );
    }

    let dayNumber;

    if (month !== 0) {

        dayNumber =
            daynum(
                year,
                month,
                Math.floor(dayFraction)
            );

    } else {

        dayNumber =
            Math.floor(dayFraction);
    }


    // --------------------------------------------------------
    // Days since J2000
    // --------------------------------------------------------

    const deltaYears =
        year - 2000;

    let deltaDays =
        deltaYears * 365 +
        Math.trunc(deltaYears / 4) +
        dayNumber;

    if (year > 2000) {
        deltaDays += 1;
    }

    let daysJ2000 =
        deltaDays - 1.5;

    const fractionalDay =
        fractionalPart(dayFraction);

    daysJ2000 +=
        fractionalDay;


    // --------------------------------------------------------
    // Julian centuries
    // --------------------------------------------------------

    const centJ2000 =
        daysJ2000 / 36525.0;


    // --------------------------------------------------------
    // Solar orbital parameters
    // --------------------------------------------------------

    let meanAnomaly =
        357.528 +
        0.9856003 * daysJ2000;

    let meanLongitude =
        280.460 +
        0.9856474 * daysJ2000;


    meanAnomaly =
        fractionalPart(
            meanAnomaly / 360.0
        ) * TWOPI;

    meanLongitude =
        fractionalPart(
            meanLongitude / 360.0
        ) * TWOPI;


    const meanObliquity =
        (
            23.439 -
            4.0e-7 * daysJ2000
        ) * DEG_RAD;


    const eclipticLongitude =
        (
            1.915 *
            Math.sin(meanAnomaly)
            +
            0.020 *
            Math.sin(
                2.0 * meanAnomaly
            )
        ) * DEG_RAD
        +
        meanLongitude;


    const distance =
        1.00014
        - 0.01671 *
        Math.cos(meanAnomaly)
        - 0.00014 *
        Math.cos(
            2.0 * meanAnomaly
        );


    // --------------------------------------------------------
    // Apparent right ascension / declination
    // --------------------------------------------------------

    let apRA =
        Math.atan2(
            Math.cos(meanObliquity) *
            Math.sin(eclipticLongitude),

            Math.cos(eclipticLongitude)
        );

    if (apRA < 0) {
        apRA += TWOPI;
    }

    apRA =
        fractionalPart(
            apRA / TWOPI
        ) * 24.0;


    const apDec =
        Math.asin(
            Math.sin(meanObliquity) *
            Math.sin(eclipticLongitude)
        );


    // --------------------------------------------------------
    // Greenwich mean sidereal time
    // --------------------------------------------------------

    let gmst0h =
        24110.54841 +
        centJ2000 *
        (
            8640184.812866 +
            centJ2000 *
            (
                0.093104 -
                centJ2000 *
                6.2e-6
            )
        );


    gmst0h =
        fractionalPart(
            gmst0h /
            3600.0 /
            24.0
        ) * 24.0;

    if (gmst0h < 0) {
        gmst0h += 24.0;
    }


    // --------------------------------------------------------
    // UT hours
    // --------------------------------------------------------

    const ut =
        fractionalDay * 24.0;


    // --------------------------------------------------------
    // Local mean sidereal time
    // --------------------------------------------------------

    let lmst =
        gmst0h +
        ut * 1.00273790934 +
        longitude / 15.0;


    lmst =
        fractionalPart(
            lmst / 24.0
        ) * 24.0;

    if (lmst < 0) {
        lmst += 24.0;
    }


    // --------------------------------------------------------
    // Local hour angle
    // --------------------------------------------------------

    let localHA =
        lmst - apRA;

    if (localHA < -12) {
        localHA += 24;
    } else if (localHA > 12) {
        localHA -= 24;
    }

    localHA =
        localHA / 24.0 *
        TWOPI;


    // --------------------------------------------------------
    // Solar altitude
    // --------------------------------------------------------

    const latRad =
        latitude * DEG_RAD;

    const cosApDec =
        Math.cos(apDec);

    const sinApDec =
        Math.sin(apDec);

    const cosLat =
        Math.cos(latRad);

    const sinLat =
        Math.sin(latRad);

    const cosLHA =
        Math.cos(localHA);


    const altitude =
        Math.asin(
            sinApDec * sinLat +
            cosApDec *
            cosLHA *
            cosLat
        );


    // --------------------------------------------------------
    // Azimuth
    // --------------------------------------------------------

    const cosAlt =
        Math.cos(altitude);

    let tanAlt;

    if (
        Math.abs(altitude) <
        1.57079615
    ) {
        tanAlt =
            Math.tan(altitude);
    } else {
        tanAlt = 6.0e6;
    }


    let cosAz =
        (
            sinApDec * cosLat -
            cosApDec *
            cosLHA *
            sinLat
        ) / cosAlt;

    cosAz =
        clamp(cosAz, -1, 1);


    const sinAz =
        -(
            cosApDec *
            Math.sin(localHA)
        ) / cosAlt;


    let azimuth =
        Math.acos(cosAz);


    if (
        Math.atan2(
            sinAz,
            cosAz
        ) < 0
    ) {
        azimuth =
            TWOPI - azimuth;
    }


    // --------------------------------------------------------
    // Atmospheric refraction
    // --------------------------------------------------------

    let altitudeDeg =
        altitude * RAD_DEG;

    let refraction = 0;

    if (
        altitudeDeg >= -1 &&
        tanAlt !== 6.0e6
    ) {

        const pressure = 1013.25;

        const temp = 15.0;

        if (altitudeDeg < 19.225) {

            refraction =
                (
                    0.1594 +
                    altitudeDeg *
                    (
                        0.0196 +
                        0.00002 *
                        altitudeDeg
                    )
                ) *
                pressure;

            refraction /=
                (
                    1.0 +
                    altitudeDeg *
                    (
                        0.505 +
                        0.0845 *
                        altitudeDeg
                    )
                ) *
                (273.0 + temp);

        } else {

            refraction =
                0.00452 *
                (
                    pressure /
                    (273.0 + temp)
                ) /
                tanAlt;
        }

        altitudeDeg +=
            refraction;
    }


    return {
        altitude: altitudeDeg,
        azimuth:
            azimuth * RAD_DEG,
        distance
    };
}


// ============================================================
// SOLAR PARAMETERS
// ============================================================
//
// Exactly follows the solar normalization/direct-beam logic
// in the original implementation.
// ============================================================

function calculateSolarParameters(
    year,
    month,
    dayFraction,
    latitude,
    longitude,
    solar
) {

    const position =
        solarPosition(
            year,
            month,
            dayFraction,
            latitude,
            longitude
        );


    let cza =
        Math.cos(
            (90.0 - position.altitude) *
            DEG_RAD
        );


    let toaSolar =
        SOLAR_CONST *
        max(0.0, cza) /
        (
            position.distance *
            position.distance
        );


    if (cza < CZA_MIN) {
        toaSolar = 0.0;
    }


    let adjustedSolar = solar;

    let fdir = 0;


    if (toaSolar > 0) {

        let normSolar =
            min(
                adjustedSolar /
                toaSolar,

                NORMSOLAR_MAX
            );


        adjustedSolar =
            normSolar *
            toaSolar;


        if (normSolar > 0) {

            fdir =
                Math.exp(
                    3.0 -
                    1.34 *
                    normSolar -
                    1.65 /
                    normSolar
                );

            fdir =
                max(
                    min(fdir, 0.9),
                    0.0
                );

        } else {

            fdir = 0;
        }

    } else {

        fdir = 0;
    }


    return {
        cza,
        fdir,
        solar: adjustedSolar,
        altitude: position.altitude,
        azimuth: position.azimuth,
        solarDistanceAU:
            position.distance
    };
}


// ============================================================
// SATURATION VAPOUR PRESSURE
// ============================================================
//
// Buck (1981) approximation used in the original code.
// Temperature input is Kelvin.
// Output is mbar/hPa.
// ============================================================

function esat(tk, phase = 0) {

    let y;
    let es;

    if (phase === 0) {

        y =
            (tk - 273.15) /
            (tk - 32.18);

        es =
            6.1121 *
            Math.exp(
                17.502 * y
            );

    } else {

        y =
            (tk - 273.15) /
            (tk - 0.6);

        es =
            6.1115 *
            Math.exp(
                22.452 * y
            );
    }


    /*
     * Moist-air correction used by original code
     * when pressure is not explicitly included.
     */

    es *= 1.004;

    return es;
}


// ============================================================
// DEW POINT
// ============================================================

function dewPoint(e, phase = 0) {

    let z;
    let tdk;

    if (phase === 0) {

        z =
            Math.log(
                e /
                (6.1121 * 1.004)
            );

        tdk =
            273.15 +
            240.97 *
            z /
            (17.502 - z);

    } else {

        z =
            Math.log(
                e /
                (6.1115 * 1.004)
            );

        tdk =
            273.15 +
            272.55 *
            z /
            (22.452 - z);
    }

    return tdk;
}


// ============================================================
// AIR VISCOSITY
// ============================================================

function viscosity(Tair) {

    const sigma = 3.617;

    const epsKappa = 97.0;

    const Tr =
        Tair / epsKappa;

    const omega =
        (
            (Tr - 2.9) /
            0.4
        ) *
        (-0.034)
        + 1.048;


    return (
        2.6693e-6 *
        Math.sqrt(
            M_AIR * Tair
        ) /
        (
            sigma *
            sigma *
            omega
        )
    );
}


// ============================================================
// THERMAL CONDUCTIVITY
// ============================================================

function thermalCond(Tair) {

    return (
        (Cp + 1.25 * R_AIR) *
        viscosity(Tair)
    );
}


// ============================================================
// WATER VAPOUR DIFFUSIVITY
// ============================================================

function diffusivity(
    Tair,
    Pair
) {

    const PcritAir = 36.4;

    const PcritH2O = 218.0;

    const TcritAir = 132.0;

    const TcritH2O = 647.3;

    const a = 3.640e-4;

    const b = 2.334;


    const Pcrit13 =
        Math.pow(
            PcritAir *
            PcritH2O,

            1.0 / 3.0
        );


    const Tcrit512 =
        Math.pow(
            TcritAir *
            TcritH2O,

            5.0 / 12.0
        );


    const Tcrit12 =
        Math.sqrt(
            TcritAir *
            TcritH2O
        );


    const Mmix =
        Math.sqrt(
            1.0 / M_AIR +
            1.0 / M_H2O
        );


    const Patm =
        Pair / 1013.25;


    return (
        a *
        Math.pow(
            Tair / Tcrit12,
            b
        ) *
        Pcrit13 *
        Tcrit512 *
        Mmix /
        Patm *
        1e-4
    );
}


// ============================================================
// LATENT HEAT / HEAT OF EVAPORATION
// ============================================================

function evap(Tair) {

    return (
        (
            (313.15 - Tair) /
            30.0
        ) *
        (-71100.0)
        + 2.4073e6
    );
}


// ============================================================
// ATMOSPHERIC EMISSIVITY
// ============================================================

function emisAtm(
    Tair,
    rh
) {

    const e =
        rh *
        esat(Tair, 0);

    return (
        0.575 *
        Math.pow(
            e,
            0.143
        )
    );
}


// ============================================================
// CYLINDER HEAT TRANSFER
// ============================================================

function hCylinderInAir(
    diameter,
    length,
    Tair,
    Pair,
    speed
) {

    const a = 0.56;

    const b = 0.281;

    const c = 0.4;


    const density =
        Pair * 100.0 /
        (
            R_AIR *
            Tair
        );


    const Re =
        max(
            speed,
            MIN_SPEED
        ) *
        density *
        diameter /
        viscosity(Tair);


    const Nu =
        b *
        Math.pow(
            Re,
            1.0 - c
        ) *
        Math.pow(
            Pr,
            1.0 - a
        );


    return (
        Nu *
        thermalCond(Tair) /
        diameter
    );
}


// ============================================================
// SPHERE HEAT TRANSFER
// ============================================================

function hSphereInAir(
    diameter,
    Tair,
    Pair,
    speed
) {

    const density =
        Pair * 100.0 /
        (
            R_AIR *
            Tair
        );


    const Re =
        max(
            speed,
            MIN_SPEED
        ) *
        density *
        diameter /
        viscosity(Tair);


    const Nu =
        2.0 +
        0.6 *
        Math.sqrt(Re) *
        Math.pow(
            Pr,
            0.3333
        );


    return (
        Nu *
        thermalCond(Tair) /
        diameter
    );
}


// ============================================================
// NATURAL WET-BULB TEMPERATURE
// ============================================================
//
// rad = 1 for natural wet bulb.
// This is the actual iterative structure used by Liljegren.
// ============================================================

function calculateNaturalWetBulb(
    Tair,
    rh,
    Pair,
    speed,
    solar,
    fdir,
    cza
) {

    const a = 0.56;

    const Tsfc =
        Tair;

    const sza =
        Math.acos(
            clamp(cza, -1, 1)
        );


    const eair =
        rh *
        esat(
            Tair,
            0
        );


    const Tdew =
        dewPoint(
            eair,
            0
        );


    let TwbPrev =
        Tdew;


    let converged =
        false;

    let TwbNew =
        TwbPrev;


    let iter = 0;


    while (
        !converged &&
        iter < MAX_ITER
    ) {

        iter++;


        const Tref =
            0.5 *
            (
                TwbPrev +
                Tair
            );


        const h =
            hCylinderInAir(
                D_WICK,
                L_WICK,
                Tref,
                Pair,
                speed
            );


        const Fatm =
            STEFANB *
            EMIS_WICK *
            (
                0.5 *
                (
                    emisAtm(
                        Tair,
                        rh
                    ) *
                    Math.pow(
                        Tair,
                        4
                    )
                    +
                    EMIS_SFC *
                    Math.pow(
                        Tsfc,
                        4
                    )
                )
                -
                Math.pow(
                    TwbPrev,
                    4
                )
            )
            +
            (
                1.0 -
                ALB_WICK
            ) *
            solar *
            (
                (
                    1.0 -
                    fdir
                ) *
                (
                    1.0 +
                    0.25 *
                    D_WICK /
                    L_WICK
                )
                +
                fdir *
                (
                    Math.tan(sza) /
                    PI
                    +
                    0.25 *
                    D_WICK /
                    L_WICK
                )
                +
                ALB_SFC
            );


        const ewick =
            esat(
                TwbPrev,
                0
            );


        const density =
            Pair * 100.0 /
            (
                R_AIR *
                Tref
            );


        const Sc =
            viscosity(Tref) /
            (
                density *
                diffusivity(
                    Tref,
                    Pair
                )
            );


        TwbNew =
            Tair
            -
            evap(Tref) /
            RATIO *
            (
                ewick -
                eair
            ) /
            (
                Pair -
                ewick
            ) *
            Math.pow(
                Pr / Sc,
                a
            )
            +
            Fatm / h;


        if (
            Math.abs(
                TwbNew -
                TwbPrev
            ) < CONVERGENCE
        ) {
            converged = true;
        }


        TwbPrev =
            0.9 *
            TwbPrev +
            0.1 *
            TwbNew;
    }


    if (!converged) {

        throw new Error(
            "Natural wet-bulb calculation did not converge."
        );
    }


    return (
        TwbNew -
        273.15
    );
}


// ============================================================
// GLOBE TEMPERATURE
// ============================================================

function calculateGlobeTemperature(
    Tair,
    rh,
    Pair,
    speed,
    solar,
    fdir,
    cza
) {

    const Tsfc =
        Tair;


    let TgPrev =
        Tair;


    let TgNew =
        TgPrev;


    let converged =
        false;


    let iter = 0;


    while (
        !converged &&
        iter < MAX_ITER
    ) {

        iter++;


        const Tref =
            0.5 *
            (
                TgPrev +
                Tair
            );


        const h =
            hSphereInAir(
                D_GLOBE,
                Tref,
                Pair,
                speed
            );


        /*
         * Important:
         *
         * The original equation contains 1/(2*cza).
         * At night cza can approach zero, so the original
         * implementation's solar term is effectively zero
         * because solar/fdir are zero.
         */

        let solarTerm = 0;


        if (
            cza >
            CZA_MIN &&
            solar > 0
        ) {

            solarTerm =
                solar /
                (
                    2.0 *
                    STEFANB *
                    EMIS_GLOBE
                ) *
                (
                    1.0 -
                    ALB_GLOBE
                )
                *
                (
                    fdir *
                    (
                        1.0 /
                        (
                            2.0 *
                            cza
                        )
                        -
                        1.0
                    )
                    +
                    1.0 +
                    ALB_SFC
                );
        }


        const inside =
            0.5 *
            (
                emisAtm(
                    Tair,
                    rh
                ) *
                Math.pow(
                    Tair,
                    4
                )
                +
                EMIS_SFC *
                Math.pow(
                    Tsfc,
                    4
                )
            )
            -
            h /
            (
                STEFANB *
                EMIS_GLOBE
            ) *
            (
                TgPrev -
                Tair
            )
            +
            solarTerm;


        TgNew =
            Math.pow(
                Math.max(
                    inside,
                    1
                ),
                0.25
            );


        if (
            Math.abs(
                TgNew -
                TgPrev
            ) < CONVERGENCE
        ) {
            converged = true;
        }


        TgPrev =
            0.9 *
            TgPrev +
            0.1 *
            TgNew;
    }


    if (!converged) {

        throw new Error(
            "Globe temperature calculation did not converge."
        );
    }


    return (
        TgNew -
        273.15
    );
}


// ============================================================
// STABILITY CLASS
// ============================================================
//
// EPA stability classification used by the original
// implementation when converting wind speed to 2 m.
// ============================================================

function stabilityClass(
    daytime,
    speed,
    solar,
    dT
) {

    const table = [
        [1, 1, 2, 4, 0, 5, 6, 0],
        [1, 2, 3, 4, 0, 5, 6, 0],
        [2, 2, 3, 4, 0, 4, 4, 0],
        [3, 3, 4, 4, 0, 0, 0, 0],
        [3, 4, 4, 4, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0]
    ];


    let i;
    let j;


    if (daytime) {

        if (solar >= 925) {
            j = 0;

        } else if (solar >= 675) {
            j = 1;

        } else if (solar >= 175) {
            j = 2;

        } else {
            j = 3;
        }


        if (speed >= 6) {
            i = 4;

        } else if (speed >= 5) {
            i = 3;

        } else if (speed >= 3) {
            i = 2;

        } else if (speed >= 2) {
            i = 1;

        } else {
            i = 0;
        }

    } else {

        if (dT >= 0) {
            j = 6;
        } else {
            j = 5;
        }


        if (speed >= 2.5) {
            i = 2;

        } else if (speed >= 2.0) {
            i = 1;

        } else {
            i = 0;
        }
    }


    return table[i][j];
}


// ============================================================
// ESTIMATE 2-M WIND SPEED
// ============================================================

function estimate2mWindSpeed(
    speed,
    zspeed,
    stability,
    urban
) {

    const urbanExp = [
        0.15,
        0.15,
        0.20,
        0.25,
        0.30,
        0.30
    ];


    const ruralExp = [
        0.07,
        0.07,
        0.10,
        0.15,
        0.35,
        0.55
    ];


    const exponent =
        urban
            ? urbanExp[stability - 1]
            : ruralExp[stability - 1];


    let estimated =
        speed *
        Math.pow(
            REF_HEIGHT /
            zspeed,
            exponent
        );


    estimated =
        max(
            estimated,
            MIN_SPEED
        );


    return estimated;
}


// ============================================================
// MAIN FUNCTION
// ============================================================

function calculateWBGT(weather) {

    const {
        temperature,
        humidity,
        windSpeed,
        windSpeedHeight = 2,
        solarRadiation,
        pressure = 1013.25,
        latitude,
        longitude,
        timestamp = new Date(),

        /*
         * Required only when windSpeedHeight !== 2.
         *
         * For a 10-m wind measurement this should ideally be
         * the measured temperature difference:
         *
         * T(10m) - T(2m)
         */
        temperatureDiff = 0,

        /*
         * true  -> urban wind profile
         * false -> rural wind profile
         */
        urban = false,

        /*
         * Meteorological averaging period.
         */
        averageMinutes = 0
    } = weather;


    // --------------------------------------------------------
    // Validate
    // --------------------------------------------------------

    const numericValues = [
        temperature,
        humidity,
        windSpeed,
        solarRadiation,
        pressure,
        latitude,
        longitude
    ];


    if (
        numericValues.some(
            x =>
                typeof x !== "number" ||
                !Number.isFinite(x)
        )
    ) {
        throw new Error(
            "Invalid WBGT input. All meteorological inputs must be finite numbers."
        );
    }


    if (
        humidity < 0 ||
        humidity > 100
    ) {
        throw new Error(
            "humidity must be between 0 and 100."
        );
    }


    if (windSpeed < 0) {
        throw new Error(
            "windSpeed cannot be negative."
        );
    }


    if (pressure <= 0) {
        throw new Error(
            "pressure must be greater than zero."
        );
    }


    if (
        latitude < -90 ||
        latitude > 90
    ) {
        throw new Error(
            "latitude must be between -90 and 90."
        );
    }


    if (
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error(
            "longitude must be between -180 and 180."
        );
    }


    if (windSpeedHeight <= 0) {
        throw new Error(
            "windSpeedHeight must be greater than zero."
        );
    }


    // --------------------------------------------------------
    // Timestamp
    // --------------------------------------------------------

    const date =
        timestamp instanceof Date
            ? new Date(timestamp.getTime())
            : new Date(timestamp);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        throw new Error(
            "Invalid timestamp."
        );
    }


    /*
     * Original Liljegren code centers an averaged observation
     * in its averaging period:
     *
     * hour_gmt = hour - gmt
     *             + (minute - 0.5 * avg) / 60
     *
     * We do the equivalent here by moving the timestamp
     * backwards by half of averageMinutes.
     */

    if (averageMinutes > 0) {

        date.setTime(
            date.getTime() -
            (
                averageMinutes *
                60 *
                1000 /
                2
            )
        );
    }


    // --------------------------------------------------------
    // Convert timestamp to UTC day fraction
    // --------------------------------------------------------

    const year =
        date.getUTCFullYear();

    const month =
        date.getUTCMonth() + 1;

    const day =
        date.getUTCDate();

    const utcHours =
        date.getUTCHours() +
        date.getUTCMinutes() / 60 +
        date.getUTCSeconds() / 3600 +
        date.getUTCMilliseconds() /
        3600000;


    const dayFraction =
        day +
        utcHours / 24.0;


    // --------------------------------------------------------
    // Solar calculations
    // --------------------------------------------------------

    const solarData =
        calculateSolarParameters(
            year,
            month,
            dayFraction,
            latitude,
            longitude,
            solarRadiation
        );


    let solar =
        solarData.solar;

    const cza =
        solarData.cza;

    const fdir =
        solarData.fdir;


    // --------------------------------------------------------
    // Wind speed
    // --------------------------------------------------------

    let speed =
        windSpeed;


    let estimatedWindSpeed =
        null;

    let stability =
        null;


    if (
        windSpeedHeight !==
        REF_HEIGHT
    ) {

        const daytime =
            cza > 0;


        stability =
            stabilityClass(
                daytime,
                speed,
                solar,
                temperatureDiff
            );


        estimatedWindSpeed =
            estimate2mWindSpeed(
                speed,
                windSpeedHeight,
                stability,
                urban
            );


        speed =
            estimatedWindSpeed;
    }


    speed =
        max(
            speed,
            MIN_SPEED
        );


    // --------------------------------------------------------
    // Convert units
    // --------------------------------------------------------

    const Tair =
        temperature +
        273.15;


    const rh =
        humidity /
        100.0;


    // --------------------------------------------------------
    // Globe temperature
    // --------------------------------------------------------

    const globeTemperature =
        calculateGlobeTemperature(
            Tair,
            rh,
            pressure,
            speed,
            solar,
            fdir,
            cza
        );


    // --------------------------------------------------------
    // Natural wet-bulb temperature
    // --------------------------------------------------------

    const naturalWetBulbTemperature =
        calculateNaturalWetBulb(
            Tair,
            rh,
            pressure,
            speed,
            solar,
            fdir,
            cza
        );


    // --------------------------------------------------------
    // FINAL OUTDOOR WBGT
    // --------------------------------------------------------

    const wbgt =
        0.1 * temperature +
        0.2 * globeTemperature +
        0.7 *
        naturalWetBulbTemperature;


    // --------------------------------------------------------
    // Return
    // --------------------------------------------------------

    return {

        wbgt:
            Number(
                wbgt.toFixed(2)
            ),

        globeTemperature:
            Number(
                globeTemperature.toFixed(2)
            ),

        naturalWetBulbTemperature:
            Number(
                naturalWetBulbTemperature.toFixed(2)
            ),

        dryBulbTemperature:
            temperature,

        windSpeed2m:
            Number(
                speed.toFixed(3)
            ),

        solarRadiationUsed:
            Number(
                solar.toFixed(2)
            ),

        solarZenithAngle:
            Number(
                (
                    Math.acos(
                        clamp(
                            cza,
                            -1,
                            1
                        )
                    ) *
                    RAD_DEG
                ).toFixed(2)
            ),

        solarAltitude:
            Number(
                solarData.altitude.toFixed(2)
            ),

        directSolarFraction:
            Number(
                fdir.toFixed(4)
            ),

        stabilityClass:
            stability,

        estimatedWindSpeed:
            estimatedWindSpeed === null
                ? null
                : Number(
                    estimatedWindSpeed.toFixed(3)
                )
    };
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {
    calculateWBGT
};