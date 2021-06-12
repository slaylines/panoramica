export const isAuthorized = false;
export const isCosmosCollection = false;
export const czDataSource = 'dump';

export const favoriteTimelines = [];
export const ellipticalZoomZoomoutFactor = 0.5;
export const ellipticalZoomDuration = 9000;
export const panSpeedFactor = 3.0;
export const zoomSpeedFactor = 2.0;
export const zoomLevelFactor = 1.4;
export const allowedVisibileImprecision = 0.00001;
export const allowedMathImprecision = 0.000001;
export const allowedMathImprecisionDecimals = parseInt(allowedMathImprecision.toExponential().split('-')[1]);
export const canvasElementAnimationTime = 1300;
export const canvasElementFadeInTime = 400;

export const contentScaleMargin = 20;
export const renderThreshold = 2;

export const targetFps = 60;
export const hoverAnimationSeconds = 2;

export const fallbackImageUri = '/images/Temp-Thumbnail2.png';

// Styles of timelines
export const timelineHeaderMargin = 1.0 / 12.0;
export const timelineHeaderSize = 1.0 / 9.0;
export const timelineTooltipMaxHeaderSize = 5;
export const timelineHeaderFontName = 'Arial';
export const timelineHeaderFontColor = 'rgb(232,232,232)';
export const timelineHoveredHeaderFontColor = 'white';
export const timelineStrokeStyle = 'rgb(232,232,232)';
export const timelineBorderColor = 'rgb(232,232,232)';
export const timelineLineWidth = 1;
export const timelineHoveredLineWidth = 1;
export const timelineMinAspect = 0.2;
export const timelineContentMargin = 0.01;
export const timelineHoveredBoxBorderColor = 'rgb(232,232,232)';
export const timelineBreadCrumbBorderOffset = 50;
export const timelineCenterOffsetAcceptableImplicity = 0.00001;
export const timelineColor = null;
export const timelineColorOverride = 'rgba(0,0,0,0.25)';
export const timelineHoverAnimation = 3 / 60.0;
export const timelineGradientFillStyle = null;

export const infodotShowContentZoomLevel = 9;
export const infodotShowContentThumbZoomLevel = 2;
export const infoDotHoveredBorderWidth = 40.0 / 450;
export const infoDotBorderWidth = 27.0 / 450;
export const infodotTitleWidth = 200.0 / 489;
export const infodotTitleHeight = 60.0 / 489;
export const infodotBibliographyHeight = 10.0 / 489;
export const infoDotBorderColor = 'rgb(232,232,232)';
export const infoDotHoveredBorderColor = 'white';
export const infoDotFillColor = 'rgb(92,92,92)';
export const infoDotTinyContentImageUri = '/images/tinyContent.png';
export const infodotMaxContentItemsCount = 10;

export const mediaContentElementZIndex = 100;
export const contentItemDescriptionNumberOfLines = 10;
export const contentItemShowContentZoomLevel = 9;
export const contentItemThumbnailMinLevel = 3;
export const contentItemThumbnailMaxLevel = 7;
export const contentItemThumbnailBaseUri = 'http://czbeta.blob.core.windows.net/images/';
export const contentItemTopTitleHeight = 47.0 / 540;
export const contentItemContentWidth = 480.0 / 520;
export const contentItemVerticalMargin = 13.0 / 540;
export const contentItemMediaHeight = 260.0 / 540;
export const contentItemSourceHeight = 10.0 / 540;
export const contentItemSourceFontColor = 'rgb(232,232,232)';
export const contentItemSourceHoveredFontColor = 'white';
export const contentItemAudioHeight = 40.0 / 540;
export const contentItemAudioTopMargin = 120.0 / 540;
export const contentItemFontHeight = 140.0 / 540;
export const contentItemHeaderFontName = 'Arial';
export const contentItemHeaderFontColor = 'white';

// See also contentItemDescriptionText class in the Styles/cz.css which decorates the description block in a content item
export const contentItemBoundingBoxBorderWidth = 13.0 / 520;
export const contentItemBoundingBoxFillColor = 'rgb(36,36,36)';
export const contentItemBoundingBoxBorderColor = undefined;
export const contentItemBoundingHoveredBoxBorderColor = 'white';

export const contentAppearanceAnimationStep = 0.01;

//navigation constraints
export const infoDotZoomConstraint = 0.005;
export const infoDotAxisFreezeThreshold = 0.75;
export const maxPermitedTimeRange = {
  left: -13700000000,
  right: 0
};
export const deeperZoomConstraints = [{
    left: -14000000000,
    right: -1000000000,
    scale: 1000
  },
  {
    left: -1000000000,
    right: -1000000,
    scale: 1
  },
  {
    left: -1000000,
    right: -12000,
    scale: 0.001
  },
  {
    left: -12000 /*approx 10k BC */ ,
    right: 0,
    scale: 0.00006
  }
];

// Timescale constants
export const tickLength = 14;
export const minTickSpace = 8;
export const minLabelSpace = 50;
export const maxTickArrangeIterations = 3;
export const minSmallTickSpace = 8;
export const smallTickLength = 7;
export const timescaleThickness = 2;

// IDs of regime timelines
export const cosmosTimelineID = "00000000-0000-0000-0000-000000000000";
export const earthTimelineID = "48fbb8a8-7c5d-49c3-83e1-98939ae2ae67";
export const lifeTimelineID = "d4809be4-3cf9-4ddd-9703-3ca24e4d3a26";
export const prehistoryTimelineID = "a6b821df-2a4d-4f0e-baf5-28e47ecb720b";
export const humanityTimelineID = "4afb5bb6-1544-4416-a949-8c8f473e544d";

// seadragon
export const seadragonServiceURL = 'http://api.zoom.it/v1/content/?url=';
export const seadragonImagePath = '/images/seadragonControls/';
export const seadragonMaxConnectionAttempts = 3;
export const seadragonRetryInterval = 2000;

// progresive loading
//export const serverUrlHost = location.protocol + "//" + location.host;
export const serverUrlHost = 'https://www.chronozoom.com';
export const serviceUrl = serverUrlHost + '/api';
export const minTimelineWidth = 100;

// Bing search API constants
export const defaultBingSearchTop = 50;
export const defaultBingSearchSkip = 0;