import { Editor, loader } from "@monaco-editor/react";
import { ArrowBack, OpenInBrowser, PlayCircleFilled, StopCircle } from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import { Button, Dialog, InputLabel, MenuItem, Select } from "@portal/components";
import * as monaco from "monaco-editor";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../../axios/api";
import { getAuthToken } from "../../../../containers/auth/auth";
import { useTranslation } from "../../../../contexts";
import { i18nKeys } from "../../../../contexts/app-context/states";
import env from "../../../../env";
import { useDatasets, useKernelViewer } from "../../../../hooks";
import { CloseDialogType, Feedback, NetworkStrategusStudy, Study, StudyDashboardTemplateData } from "../../../../types";
import "./ManageStrategusResultViewerDialog.scss";

interface ManageStrategusResultViewerDialogProps {
  study: NetworkStrategusStudy;
  open: boolean;
  onClose?: (type: CloseDialogType) => void;
}

const SafeEditor = Editor as any;

const ManageStrategusResultViewerDialog: FC<ManageStrategusResultViewerDialogProps> = ({ study, open, onClose }) => {
  loader.config({ monaco });
  const { getText } = useTranslation();
  const [viewerCode, setViewerCode] = useState<string>("");
  const [defaultViewerCode, setDefaultViewerCode] = useState<string>("");
  const [templates, setTemplates] = useState<StudyDashboardTemplateData[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({});
  const [bearerToken, setBearerToken] = useState<string>("");
  const [isIframeViewerOpen, setIsIframeViewerOpen] = useState<boolean>(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const VIEWER_BASE_URL = `${env.REACT_APP_DN_BASE_URL}strategus-results/${study.studyId}/`;

  const [datasets, loadingDatasets] = useDatasets("systemAdmin");
  const [viewerStatus, startViewer, stopViewer] = useKernelViewer(study.studyId, selectedDatasetId);

  useEffect(() => {
    console.log("ManageStrategusResultViewerDialog - VIEWER_BASE_URL:", VIEWER_BASE_URL);
    console.log("ManageStrategusResultViewerDialog - env.REACT_APP_DN_BASE_URL:", env.REACT_APP_DN_BASE_URL);
  }, [VIEWER_BASE_URL]);

  const getTemplates = useCallback(async () => {
    const templates = await api.strategusAnalysis.getStudyViewerTemplates();
    setTemplates(templates);
  }, []);

  const getDefaultStrategusViewerCode = useCallback(async () => {
    try {
      const latestStudy = await api.strategusAnalysis.getStrategusAnalysis(study?.studyId);
      setViewerCode(latestStudy.viewerCode ? latestStudy.viewerCode : "");
      setDefaultViewerCode(latestStudy.viewerCode ? latestStudy.viewerCode : "");
    } catch (error) {
      console.error("Failed to fetch default viewer code:", error);
      setDefaultViewerCode("");
    }
  }, [study?.studyId]);

  useEffect(() => {
    getTemplates();
    getDefaultStrategusViewerCode();
  }, [getTemplates]);

  useEffect(() => {
    console.log("isIframeViewerOpen changed:", isIframeViewerOpen);
  }, [isIframeViewerOpen]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAuthToken(false);
        if (token) {
          setBearerToken(token);
        }
      } catch (error) {
        console.error("Error fetching auth token:", error);
      }
    };

    fetchToken();
  }, []);

  useEffect(() => {
    if (isIframeViewerOpen && iframeRef.current && iframeRef.current.contentWindow && bearerToken) {
      try {
        iframeRef.current.contentWindow.document.cookie = `authtoken=${bearerToken}; path=/strategus-results; secure; SameSite=Strict;`;
      } catch (error) {
        console.error("Error setting cookie in iframe:", error);
      }
    }

    const onTokenRefreshed = (e: Event) => {
      const token = (e as CustomEvent)?.detail?.accessToken as string | undefined;
      if (!token) return;
      setBearerToken(token);
      document.cookie = `authtoken=${token}; path=/strategus-results; secure; SameSite=Strict;`;
      if (isIframeViewerOpen && iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.document.cookie = `authtoken=${token}; path=/strategus-results; secure; SameSite=Strict;`;
        } catch (err) {
          console.error("Error updating iframe cookie after OIDC refresh:", err);
        }
        try {
          const src = new URL(iframeRef.current.src);
          src.searchParams.set("t", Date.now().toString());
          iframeRef.current.src = src.toString();
        } catch (err) {
          console.warn("Cache-busting failed; resetting to base URL", err);
          if (iframeRef.current) iframeRef.current.src = VIEWER_BASE_URL;
        }
      }
    };
    window.addEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
    return () => window.removeEventListener("oidc:token_refreshed", onTokenRefreshed as EventListener);
  }, [isIframeViewerOpen, bearerToken, VIEWER_BASE_URL]);

  const handleOpenIframeViewer = useCallback(() => {
    console.log("handleOpenIframeViewer called", { selectedDatasetId, viewerStatus, bearerToken: !!bearerToken });
    if (!selectedDatasetId) {
      setFeedback({
        type: "error",
        message: "Please select a dataset before opening the viewer",
      });
      return;
    }
    if (bearerToken) {
      try {
        document.cookie = `authtoken=${bearerToken}; path=/strategus-results; secure; SameSite=Strict;`;
        console.log("Auth cookie set successfully");
      } catch (err) {
        console.error("Error setting parent cookie before opening iframe:", err);
      }
    }
    console.log("Setting isIframeViewerOpen to true");
    setIsIframeViewerOpen(true);
  }, [bearerToken, selectedDatasetId]);

  const handleCloseIframeViewer = useCallback(() => {
    setIsIframeViewerOpen(false);
  }, []);

  const handleStartViewer = useCallback(async () => {
    if (!selectedDatasetId) {
      setFeedback({
        type: "error",
        message: "Please select a dataset before starting the viewer",
      });
      return;
    }
    try {
      await startViewer(viewerCode);
    } catch (error) {
      console.error("Failed to start viewer:", error);
    }
  }, [startViewer, viewerCode, selectedDatasetId]);

  const handleStopViewer = useCallback(async () => {
    try {
      await stopViewer();
    } catch (error) {
      console.error("Failed to stop viewer:", error);
    }
  }, [stopViewer]);

  const handleClose = useCallback(
    (type: CloseDialogType) => {
      setFeedback({});
      typeof onClose === "function" && onClose(type);
    },
    [onClose]
  );

  const handleSave = useCallback(async () => {
    setFeedback({});
    try {
      setLoading(true);
      await api.strategusAnalysis.saveStategusAnalysisViewerCode(study?.studyId, viewerCode);
      setFeedback({
        type: "success",
        message: getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__SAVE_SUCCESS),
      });
      setDefaultViewerCode(viewerCode);
      setSelectedTemplate("default");
    } catch (error) {
      console.error("Failed to save code:", error);
      setFeedback({
        type: "error",
        message: getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__SAVE_ERROR, [study.studyId]),
      });
    } finally {
      setLoading(false);
    }
  }, [viewerCode, study.studyId, getText]);

  const clearFeedback = useCallback(() => {
    setFeedback({});
  }, []);

  return (
    <>
      <Dialog
        className="manage-strategus-result-viewer-dialog"
        title={getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__TITLE, [study.studyId])}
        closable
        fullWidth
        maxWidth="lg"
        open={open}
        onClose={() => handleClose("cancelled")}
        feedback={feedback}
        onCloseFeedback={clearFeedback}
      >
        <Divider />

        <div className="manage-strategus-result-viewer-dialog__header">
          <div>
            <InputLabel sx={{ mb: 1 }}>Template</InputLabel>
            <Select
              sx={{ width: "100%" }}
              variant="standard"
              value={selectedTemplate}
              onChange={(event) => {
                const filename = event.target.value;
                setSelectedTemplate(filename);
                if (filename === "default") {
                  setViewerCode(defaultViewerCode);
                } else {
                  const tmpl = templates.find((t) => t.filename === filename);
                  if (tmpl?.content) {
                    setViewerCode(tmpl.content);
                  }
                }
              }}
            >
              <MenuItem value="default">
                <em>Default</em>
              </MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.filename} value={template.filename}>
                  {template?.filename}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div>
            <InputLabel sx={{ mb: 1 }}>
              {getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__SELECT_DATASET)}
            </InputLabel>
            <Select
              sx={{ width: "100%" }}
              variant="standard"
              value={selectedDatasetId}
              onChange={(event) => setSelectedDatasetId(event.target.value)}
              disabled={loadingDatasets}
            >
              <MenuItem value="">
                <em>Select a dataset</em>
              </MenuItem>
              {datasets?.map((dataset: Study) => (
                <MenuItem key={dataset.id} value={dataset.id}>
                  {dataset.studyDetail?.name || dataset.tokenStudyCode}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div className="manage-strategus-result-viewer-dialog__header__content">
            <Button
              onClick={handleStartViewer}
              startIcon={
                viewerStatus === "starting" ? (
                  <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                ) : (
                  <PlayCircleFilled className="study-card__action-icon" />
                )
              }
              text={
                viewerStatus === "starting"
                  ? getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__STARTING_VIEWER)
                  : getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__START_VIEWER)
              }
              disabled={viewerStatus !== "down" && viewerStatus !== "failed"}
              variant="text"
            />

            <Button
              startIcon={
                viewerStatus === "stopping" ? (
                  <CircularProgress size={16} className="study-card__action-icon study-card__loading-icon" />
                ) : (
                  <StopCircle className="study-card__action-icon" />
                )
              }
              text={
                viewerStatus === "stopping"
                  ? getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__STOPPING_VIEWER)
                  : getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__STOP_VIEWER)
              }
              disabled={viewerStatus !== "up"}
              variant="text"
              onClick={handleStopViewer}
            />

            <Button
              onClick={handleOpenIframeViewer}
              startIcon={<OpenInBrowser className="study-card__action-icon" />}
              text={getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__OPEN_VIEWER)}
              disabled={viewerStatus !== "up" || !selectedDatasetId}
              variant="text"
            />
          </div>
          <div className="manage-strategus-result-viewer-dialog__header__content">
            {getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__VIEWER_STATUS, [viewerStatus])}
          </div>
        </div>
        <Divider />

        <div className="manage-strategus-result-viewer-dialog__content">
          <SafeEditor
            height="70vh"
            language="r"
            value={viewerCode}
            options={{
              scrollBeyondLastLine: false,
              fontSize: "14px",
            }}
            onChange={setViewerCode}
          />
        </div>
        <Divider />

        <div className="button-group-actions">
          <Button
            text={getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__CANCEL)}
            onClick={() => handleClose("cancelled")}
            variant="outlined"
            block
          />
          <Button
            text={getText(i18nKeys.MANAGE_STRATEGUS_RESULT_VIEWER_DIALOG__SAVE)}
            onClick={handleSave}
            block
            loading={loading}
          />
        </div>
      </Dialog>

      {isIframeViewerOpen && (
        <div className="manage-strategus-result-viewer-dialog__fullscreen-overlay">
          <div className="manage-strategus-result-viewer-dialog__fullscreen-header">
            <button onClick={handleCloseIframeViewer} className="manage-strategus-result-viewer-dialog__back-button">
              <ArrowBack className="manage-strategus-result-viewer-dialog__back-icon" />
              <span>Back</span>
            </button>
            <span className="manage-strategus-result-viewer-dialog__viewer-title">
              Results Viewer - {study.studyId}
            </span>
          </div>
          <iframe
            ref={iframeRef}
            src={VIEWER_BASE_URL}
            title="Fullscreen Iframe Viewer"
            className="manage-strategus-result-viewer-dialog__fullscreen-iframe"
          />
        </div>
      )}
    </>
  );
};

export default ManageStrategusResultViewerDialog;
