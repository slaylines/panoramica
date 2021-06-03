export const contentScaleMargin = 20;
export const allowedMathImprecision = 0.000001;
export const allowedMathImprecisionDecimals = parseInt(allowedMathImprecision.toExponential().split("-")[1]);

// Styles of timelines
export const timescaleThickness = 2;

// Timescale constants
export const tickLength = 14;
export const minTickSpace = 8;
export const minLabelSpace = 50;
export const maxTickArrangeIterations = 3;
export const minSmallTickSpace = 8;
export const smallTickLength = 7;


// Navigation constraints
export const maxPermitedTimeRange = { left: -13700000000, right: 0 };
