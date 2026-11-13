import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import {
  Save,
  X,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  GraduationCap,
  Briefcase,
  Globe,
  Award,
  Link2,
} from "lucide-react";
import { Education, Experience, CustomLink } from "../data/people/types";

// Helper for Google Drive direct file retrieval
function getDriveImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.includes("drive.google.com")) {
    const matches =
      trimmed.match(/\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matches && matches[1]) {
      return `https://drive.usercontent.google.com/download?id=${matches[1]}&export=download`;
    }
  }
  return trimmed;
}

interface ProfileEditorProps {
  user: any;
  editRole: string;
  setEditRole: (v: string) => void;
  editBio: string;
  setEditBio: (v: string) => void;
  editImage: string;
  setEditImage: (v: string) => void;
  editBannerImages: string[];
  setEditBannerImages: Dispatch<SetStateAction<string[]>>;
  editEducation: Education[];
  setEditEducation: (v: Education[]) => void;
  editExperience: Experience[];
  setEditExperience: (v: Experience[]) => void;
  editBoardMemberType: string;
  setEditBoardMemberType: (v: string) => void;
  editPublicationsText: string;
  setEditPublicationsText: (v: string) => void;
  scholarPubs: string[];
  setScholarPubs: (v: string[]) => void;
  editCitations: number | undefined;
  setEditCitations: (v: number | undefined) => void;
  editHIndex: number | undefined;
  setEditHIndex: (v: number | undefined) => void;
  editI10Index: number | undefined;
  setEditI10Index: (v: number | undefined) => void;
  editPublicationCount: number | undefined;
  setEditPublicationCount: (v: number | undefined) => void;
  editLinkedin: string;
  setEditLinkedin: (v: string) => void;
  editWebsite: string;
  setEditWebsite: (v: string) => void;
  editTwitter: string;
  setEditTwitter: (v: string) => void;
  editGithub: string;
  setEditGithub: (v: string) => void;
  editAcademia: string;
  setEditAcademia: (v: string) => void;
  editResearchGate: string;
  setEditResearchGate: (v: string) => void;
  editRealGoogleScholar: string;
  setEditRealGoogleScholar: (v: string) => void;
  editGoogleScholarCitations: number | undefined;
  setEditGoogleScholarCitations: (v: number | undefined) => void;
  editSemanticScholar: string;
  setEditSemanticScholar: (v: string) => void;
  editSemanticScholarCitations: number | undefined;
  setEditSemanticScholarCitations: (v: number | undefined) => void;
  editOrcid: string;
  setEditOrcid: (v: string) => void;
  editOtherLinks: CustomLink[];
  setEditOtherLinks: (v: CustomLink[]) => void;

  // New states
  editResearchInterests: string[];
  setEditResearchInterests: (v: string[]) => void;
  editManualEvents: any[];
  setEditManualEvents: (v: any[]) => void;
  editManualCourses: any[];
  setEditManualCourses: (v: any[]) => void;

  // Save triggers
  handleSave: () => void;
  onCancel: () => void;
  uploadToCloudinary: (params: { dataUrl?: string; imageUrl?: string }) => Promise<string>;
  isUploadingCloudinary: boolean;
  cloudinaryProgress: string;
  handleOpenDrivePicker: (target: "profile" | "banner") => void;
}

export function ProfileEditor({
  user,
  editRole,
  setEditRole,
  editBio,
  setEditBio,
  editImage,
  setEditImage,
  editBannerImages,
  setEditBannerImages,
  editEducation,
  setEditEducation,
  editExperience,
  setEditExperience,
  editBoardMemberType,
  setEditBoardMemberType,
  editPublicationsText,
  setEditPublicationsText,
  editCitations,
  setEditCitations,
  editHIndex,
  setEditHIndex,
  editI10Index,
  setEditI10Index,
  editPublicationCount,
  setEditPublicationCount,
  editLinkedin,
  setEditLinkedin,
  editWebsite,
  setEditWebsite,
  editTwitter,
  setEditTwitter,
  editGithub,
  setEditGithub,
  editAcademia,
  setEditAcademia,
  editResearchGate,
  setEditResearchGate,
  editRealGoogleScholar,
  setEditRealGoogleScholar,
  editGoogleScholarCitations,
  setEditGoogleScholarCitations,
  editSemanticScholar,
  setEditSemanticScholar,
  editSemanticScholarCitations,
  setEditSemanticScholarCitations,
  editOrcid,
  setEditOrcid,
  editOtherLinks,
  setEditOtherLinks,

  editResearchInterests,
  setEditResearchInterests,
  editManualEvents,
  setEditManualEvents,
  editManualCourses,
  setEditManualCourses,

  handleSave,
  onCancel,
  uploadToCloudinary,
  isUploadingCloudinary,
  cloudinaryProgress,
  handleOpenDrivePicker,
}: ProfileEditorProps) {
  const [activeEditTab, setActiveEditTab] = useState<"media" | "vitae" | "curriculum" | "scholars">("media");

  // Local state for Education form input fields
  const [newEduDegree, setNewEduDegree] = useState("");
  const [newEduIns, setNewEduIns] = useState("");
  const [newEduYear, setNewEduYear] = useState("");

  // Local state for Experience form input fields
  const [newExpRole, setNewExpRole] = useState("");
  const [newExpOrg, setNewExpOrg] = useState("");
  const [newExpPeriod, setNewExpPeriod] = useState("");
  const [newExpDesc, setNewExpDesc] = useState("");

  // Local state for Research Interest tag creation
  const [newResearchInterest, setNewResearchInterest] = useState("");

  // Local state for Link creation
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [uploadingCovers,setUploadingCovers]=useState(false);
  const [coverUploadError,setCoverUploadError]=useState("");
  const [newBannerUrlInput, setNewBannerUrlInput] = useState("");

  // Local states for custom Event / Calendar mapping (Requirement 3)
  const [allDbEvents, setAllDbEvents] = useState<any[]>([]);
  const [selectedDbEventSlug, setSelectedDbEventSlug] = useState("");
  const [selectedDbEventRole, setSelectedDbEventRole] = useState("Presenter");

  const [manEventName, setManEventName] = useState("");
  const [manEventDates, setManEventDates] = useState("");
  const [manEventVenue, setManEventVenue] = useState("");
  const [manEventLink, setManEventLink] = useState("");
  const [manEventRole, setManEventRole] = useState("Presenter");

  // Local states for custom LMS / Course syllabus mapping (Requirement 4)
  const [allDbCourses, setAllDbCourses] = useState<any[]>([]);
  const [selectedDbCourseSlug, setSelectedDbCourseSlug] = useState("");
  const [selectedDbCourseRole, setSelectedDbCourseRole] = useState("Instructor");

  const [manCourseName, setManCourseName] = useState("");
  const [manCourseDates, setManCourseDates] = useState("");
  const [manCourseVenue, setManCourseVenue] = useState("");
  const [manCourseLink, setManCourseLink] = useState("");
  const [manCourseRole, setManCourseRole] = useState("Instructor");

  // Load lookup datasets automatically
  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setAllDbEvents(data.events || []))
      .catch((e) => console.error("Could not fetch lookups:", e));

    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => setAllDbCourses(data.courses || []))
      .catch((e) => console.error("Could not fetch lookups:", e));
  }, []);

  const handleAddEducation = () => {
    if (newEduDegree.trim() && newEduIns.trim()) {
      setEditEducation([
        ...editEducation,
        {
          degree: newEduDegree.trim(),
          institution: newEduIns.trim(),
          year: newEduYear.trim() || "N/A",
        },
      ]);
      setNewEduDegree("");
      setNewEduIns("");
      setNewEduYear("");
    }
  };

  const handleAddExperience = () => {
    if (newExpRole.trim() && newExpOrg.trim()) {
      setEditExperience([
        ...editExperience,
        {
          role: newExpRole.trim(),
          organization: newExpOrg.trim(),
          period: newExpPeriod.trim() || "Present",
          description: newExpDesc.trim() || undefined,
        },
      ]);
      setNewExpRole("");
      setNewExpOrg("");
      setNewExpPeriod("");
      setNewExpDesc("");
    }
  };

  const handleAddCustomLink = () => {
    if (newLinkName.trim() && newLinkUrl.trim()) {
      setEditOtherLinks([
        ...editOtherLinks,
        {
          label: newLinkName.trim(),
          url: newLinkUrl.trim(),
        },
      ]);
      setNewLinkName("");
      setNewLinkUrl("");
    }
  };

  const handleAddBannerUrl = async () => {
    if (newBannerUrlInput.trim()) {
      const processed = getDriveImageUrl(newBannerUrlInput.trim());
      if (processed) {
        const finalUrl = await uploadToCloudinary({ imageUrl: processed });
        setEditBannerImages(previous=>[...previous,finalUrl]);
        setNewBannerUrlInput("");
      }
    }
  };

  return (
    <div className="border-2 border-ink bg-white shadow-[12px_12px_0px_rgba(0,0,0,1)] p-6 md:p-10 space-y-8 text-ink">
      <div className="border-b border-ink/10 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="font-mono text-[10px] bg-brand-acid text-ink px-2.5 py-1 uppercase tracking-widest font-black border border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            Faculty secure editor
          </span>
          <h2 className="text-2xl md:text-4xl font-serif font-black tracking-tight mt-3">
            Modify Dossier Documents &amp; Curricula
          </h2>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={uploadingCovers || isUploadingCloudinary}
            className="h-10 px-5 bg-brand-blue text-paper border border-ink font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink hover:text-white transition-all shadow-[2px_2px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save Overrides
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-5 border border-ink text-ink font-mono text-[10px] font-black uppercase hover:bg-ink/5 transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Elegant tab boundaries with brutalist bold accents */}
      <div className="flex flex-wrap border-b-2 border-ink bg-paper/10">
        <button
          type="button"
          onClick={() => setActiveEditTab("media")}
          className={`py-3 px-6 font-mono text-xs font-black uppercase tracking-wider border-r border-ink border-b-2 last:border-r-0 transition-colors cursor-pointer ${
            activeEditTab === "media"
              ? "bg-brand-acid text-ink border-b-brand-blue border-b-4 font-bold"
              : "hover:bg-ink/5 border-b-transparent"
          }`}
        >
          📸 1. Media &amp; Biography
        </button>
        <button
          type="button"
          onClick={() => setActiveEditTab("vitae")}
          className={`py-3 px-6 font-mono text-xs font-black uppercase tracking-wider border-r border-ink border-b-2 last:border-r-0 transition-colors cursor-pointer ${
            activeEditTab === "vitae"
              ? "bg-brand-acid text-ink border-b-brand-blue border-b-4 font-bold"
              : "hover:bg-ink/5 border-b-transparent"
          }`}
        >
          📜 2. Academic Vitae
        </button>
        <button
          type="button"
          onClick={() => setActiveEditTab("curriculum")}
          className={`py-3 px-6 font-mono text-xs font-black uppercase tracking-wider border-r border-ink border-b-2 last:border-r-0 transition-colors cursor-pointer ${
            activeEditTab === "curriculum"
              ? "bg-brand-acid text-ink border-b-brand-blue border-b-4 font-bold"
              : "hover:bg-ink/5 border-b-transparent"
          }`}
        >
          ⚡ 3. Events &amp; Courses
        </button>
        <button
          type="button"
          onClick={() => setActiveEditTab("scholars")}
          className={`py-3 px-6 font-mono text-xs font-black uppercase tracking-wider border-r border-ink border-b-2 last:border-r-0 transition-colors cursor-pointer ${
            activeEditTab === "scholars"
              ? "bg-brand-acid text-ink border-b-brand-blue border-b-4 font-bold"
              : "hover:bg-ink/5 border-b-transparent"
          }`}
        >
          🌐 4. Social networks &amp; Scholars
        </button>
      </div>

      {/* TAB PANEL 1: MEDIA & BIO */}
      {activeEditTab === "media" && (
        <div className="space-y-6">
          <div className="space-y-6">
            <h3 className="font-mono text-xs font-black uppercase tracking-widest text-brand-orange flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Pictures &amp; Banner Cover Collage Layout
            </h3>

            {isUploadingCloudinary && (
              <div className="p-3 bg-brand-blue/10 border border-brand-blue text-ink font-mono text-[11px] flex items-center gap-3 animate-pulse">
                <span className="w-2.5 h-2.5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin shrink-0"></span>
                <span>{cloudinaryProgress || "Uploading media metadata..."}</span>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6 bg-paper/20 p-5 border border-ink">
              <div className="space-y-4">
                <span className="block font-mono text-[10px] uppercase font-black text-ink/70">
                  Main avatar profile url
                </span>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editImage}
                      onChange={(e) => setEditImage(e.target.value)}
                      onBlur={async () => {
                        const direct = getDriveImageUrl(editImage);
                        if (direct && !direct.startsWith("https://res.cloudinary.com")) {
                          const cloudUrl = await uploadToCloudinary({ imageUrl: direct });
                          setEditImage(cloudUrl);
                        } else if (direct) {
                          setEditImage(direct);
                        }
                      }}
                      placeholder="Paste portrait file web URL (https://...)"
                      className="flex-1 p-2.5 border border-ink bg-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenDrivePicker("profile")}
                      className="px-3 bg-brand-blue text-paper border border-ink font-mono text-[9px] font-black uppercase hover:bg-ink transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      Drive
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-ink text-paper text-[9.5px] font-mono font-black uppercase tracking-wider hover:bg-brand-acid hover:text-ink cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = async () => {
                              const base64 = reader.result as string;
                              const uploadedUrl = await uploadToCloudinary({ dataUrl: base64 });
                              setEditImage(uploadedUrl);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <span className="text-[9px] font-mono text-ink/50">Local file upload</span>
                  </div>
                </div>

                {editImage && (
                  <div className="w-20 h-20 border border-ink relative bg-white">
                    <img
                      src={getDriveImageUrl(editImage) || ""}
                      alt="Preview"
                      className="w-full h-full object-cover grayscale"
                    />
                    <button
                      type="button"
                      onClick={() => setEditImage("")}
                      className="absolute -top-1 -right-1 bg-brand-orange text-white p-1 hover:bg-ink"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Banners collage layout details */}
              <div className="space-y-4">
                <span className="block font-mono text-[10px] uppercase font-black text-ink/70">
                  Multiple display cover banner sliders
                </span>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste cover banner link (https://...)"
                      value={newBannerUrlInput}
                      onChange={(e) => setNewBannerUrlInput(e.target.value)}
                      onBlur={async () => {
                        const direct = getDriveImageUrl(newBannerUrlInput);
                        if (direct && !direct.startsWith("https://res.cloudinary.com")) {
                          const cloudUrl = await uploadToCloudinary({ imageUrl: direct });
                          setNewBannerUrlInput(cloudUrl);
                        } else if (direct) {
                          setNewBannerUrlInput(direct);
                        }
                      }}
                      className="flex-grow p-2.5 border border-ink bg-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddBannerUrl}
                      className="px-3 bg-ink text-paper text-[10px] font-mono font-black uppercase hover:bg-brand-acid hover:text-ink cursor-pointer shrink-0"
                    >
                      Add URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDrivePicker("banner")}
                      className="px-3 bg-brand-blue text-paper font-mono text-[9px] font-black uppercase hover:bg-ink flex items-center gap-1 shrink-0 cursor-pointer border border-ink"
                    >
                      Drive
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 border border-ink bg-ink text-paper text-[9.5px] font-mono font-black uppercase hover:bg-brand-acid hover:text-ink cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingCovers?"Uploading covers…":"Select cover images"}</span>
                      <input
                        type="file"
                        multiple
                        aria-label="Upload cover images"
                        disabled={uploadingCovers}
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          e.target.value = "";
                          setUploadingCovers(true);setCoverUploadError("");
                          try {
                            for (const file of files) {
                              const dataUrl = await new Promise<string>((resolve,reject)=>{
                                const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error("Could not read image"));reader.readAsDataURL(file);
                              });
                              const url=await uploadToCloudinary({dataUrl});
                              if(!url)throw new Error("Image upload did not return a URL");
                              setEditBannerImages(previous=>[...previous,url]);
                            }
                          } catch(error) {setCoverUploadError("A cover could not be uploaded. Uploaded covers have been kept; please retry the remaining images.");}
                          finally {setUploadingCovers(false);}

                        }}
                      />
                    </label>
                  </div>
                </div>

                {coverUploadError&&<p role="alert">{coverUploadError}</p>}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {editBannerImages.map((bURL, idx) => (
                    <div key={idx} className="aspect-video border border-ink/40 relative group overflow-hidden bg-white">
                      <img src={getDriveImageUrl(bURL) || ""} className="w-full h-full object-contain" alt={`Cover ${idx+1}`} />
                      <button
                        type="button"
                        aria-label={`Remove cover ${idx+1}`}
                        onClick={() => setEditBannerImages(previous=>previous.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-brand-orange text-white p-0.5 text-[8px] font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 pt-5 border-t border-ink/10">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
                  Academic Designation / role
                </span>
                <input
                  type="text"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Senior Instructor of Quantitative Phonetics"
                  className="w-full p-3 border border-ink bg-paper/20 font-serif text-sm font-bold focus:bg-white focus:outline-none"
                />
              </div>

              {(user?.role === "admin" || user?.role === "superadmin") && (
                <div className="space-y-1">
                  <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
                    Advising board / superadmin override category
                  </span>
                  <select
                    value={editBoardMemberType}
                    onChange={(e) => setEditBoardMemberType(e.target.value)}
                    className="w-full p-3 border border-ink bg-white font-mono text-xs uppercase font-bold cursor-pointer"
                  >
                    <option value="staff">Core Staff / Primary Personnel</option>
                    <option value="board">The Board &amp; Leadership</option>
                    <option value="rab">Research Advisory Board</option>
                    <option value="external">Collaborator (External)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
                Executive Profile narrative bio
              </span>
              <textarea
                rows={5}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Log executive biographies..."
                className="w-full p-3 border border-ink bg-paper/20 font-serif text-xs leading-relaxed focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Research Interests (Requirement 6) */}
          <div className="space-y-3 pt-5 border-t border-ink/10">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
              Research Interests cloud tags
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type and press Enter (e.g. Cognitive NLP, Phonology preservation)"
                value={newResearchInterest}
                onChange={(e) => setNewResearchInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newResearchInterest.trim() && !editResearchInterests.includes(newResearchInterest.trim())) {
                      setEditResearchInterests([...editResearchInterests, newResearchInterest.trim()]);
                      setNewResearchInterest("");
                    }
                  }
                }}
                className="flex-grow p-2.5 border border-ink bg-white font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (newResearchInterest.trim() && !editResearchInterests.includes(newResearchInterest.trim())) {
                    setEditResearchInterests([...editResearchInterests, newResearchInterest.trim()]);
                    setNewResearchInterest("");
                  }
                }}
                className="px-4 bg-ink text-paper text-[10px] font-mono font-black uppercase hover:bg-brand-acid hover:text-ink cursor-pointer shrink-0 border border-ink"
              >
                Add tag
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {editResearchInterests.map((interest, idx) => (
                <span
                  key={idx}
                  className="font-mono text-[9px] font-bold uppercase bg-brand-orange/10 border border-brand-orange/20 text-brand-orange px-2.5 py-1 flex items-center gap-1.5"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => setEditResearchInterests(editResearchInterests.filter((_, i) => i !== idx))}
                    className="font-black text-brand-orange hover:text-ink text-[11px]"
                  >
                    ×
                  </button>
                </span>
              ))}
              {editResearchInterests.length === 0 && (
                <span className="text-[10px] font-mono text-ink/30 italic">No research interests mapped yet.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB PANEL 2: ACADEMIC VITAE */}
      {activeEditTab === "vitae" && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Degree collection */}
          <div className="border border-ink p-5 space-y-4 bg-paper/10">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
              Degrees &amp; Academic Qualifications
            </span>
            <div className="space-y-2 pt-2 border-t border-dashed border-ink/10">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Degree, e.g. PhD in Syntax"
                  value={newEduDegree}
                  onChange={(e) => setNewEduDegree(e.target.value)}
                  className="p-2 border border-ink text-[11px] font-serif bg-white"
                />
                <input
                  type="text"
                  placeholder="Institution/University"
                  value={newEduIns}
                  onChange={(e) => setNewEduIns(e.target.value)}
                  className="p-2 border border-ink text-[11px] font-serif bg-white"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Year, e.g., 2019"
                  value={newEduYear}
                  onChange={(e) => setNewEduYear(e.target.value)}
                  className="p-2 border border-ink text-[11px] font-serif flex-grow bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddEducation}
                  className="px-3 bg-ink text-paper font-mono text-[9px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-brand-blue cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editEducation.map((edu, idx) => (
                <div key={idx} className="p-2 bg-white border border-ink flex justify-between items-center text-xs">
                  <div>
                    <span className="font-serif font-bold text-ink">{edu.degree}</span>
                    <p className="font-mono text-[9px] opacity-60">{edu.institution} ({edu.year})</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditEducation(editEducation.filter((_, i) => i !== idx))}
                    className="text-brand-orange text-[10px] font-mono hover:underline font-bold"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Experience collection */}
          <div className="border border-ink p-5 space-y-4 bg-paper/10">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
              Employment timeline chronicle
            </span>
            <div className="space-y-2 pt-2 border-t border-dashed border-ink/10">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Role, e.g. Researcher"
                  value={newExpRole}
                  onChange={(e) => setNewExpRole(e.target.value)}
                  className="p-2 border border-ink text-[11px] font-serif bg-white"
                />
                <input
                  type="text"
                  placeholder="Organization / Lab"
                  value={newExpOrg}
                  onChange={(e) => setNewExpOrg(e.target.value)}
                  className="p-2 border border-ink text-[11px] font-serif bg-white"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Dates, e.g. 2021 - Present"
                  value={newExpPeriod}
                  onChange={(e) => setNewExpPeriod(e.target.value)}
                  className="p-2 border border-ink text-[11px] font-serif flex-grow bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddExperience}
                  className="px-3 bg-ink text-paper font-mono text-[9px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-brand-blue cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editExperience.map((exp, idx) => (
                <div key={idx} className="p-2 bg-white border border-ink flex justify-between items-center text-xs">
                  <div>
                    <span className="font-serif font-bold text-ink">{exp.role}</span>
                    <p className="font-mono text-[9px] opacity-60">{exp.organization} ({exp.period})</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditExperience(editExperience.filter((_, i) => i !== idx))}
                    className="text-brand-orange text-[10px] font-mono hover:underline font-bold"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB PANEL 3: EVENTS & COURSES (Requirements 3 & 4) */}
      {activeEditTab === "curriculum" && (
        <div className="space-y-6">
          {/* Requirement 3 Section */}
          <div className="border border-ink p-4 space-y-4 bg-paper/5">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
              Requirement 3: Events, Conferences and Lectures
            </span>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Internal */}
              <div className="border border-ink/45 bg-white p-3.5 space-y-3">
                <span className="block font-mono text-[9px] uppercase font-bold text-brand-blue">
                  Add Internal system Event Calendar Link
                </span>
                <select
                  value={selectedDbEventSlug}
                  onChange={(e) => setSelectedDbEventSlug(e.target.value)}
                  className="w-full p-2 border border-ink font-mono text-xs uppercase bg-white"
                >
                  <option value="">-- Choose system event in DB --</option>
                  {allDbEvents.map((evt) => (
                    <option key={evt.slug} value={evt.slug}>
                      {evt.title} ({evt.dates})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Liaison Role (e.g. Organiser, Mentor, Speaker)"
                    value={selectedDbEventRole}
                    onChange={(e) => setSelectedDbEventRole(e.target.value)}
                    className="p-2 border border-ink font-mono text-xs flex-grow"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const matched = allDbEvents.find((e) => e.slug === selectedDbEventSlug);
                      if (matched) {
                        const verified = editManualEvents.some(
                          (m) => m.isInternal && m.eventSlug === selectedDbEventSlug
                        );
                        if (!verified) {
                          setEditManualEvents([
                            ...editManualEvents,
                            {
                              isInternal: true,
                              eventSlug: matched.slug,
                              name: matched.title,
                              dates: matched.dates,
                              venue: matched.location || "CoDIN Premises",
                              link: `/events/${matched.slug}`,
                              role: selectedDbEventRole || "Coordinator",
                            },
                          ]);
                          setSelectedDbEventSlug("");
                        } else {
                          alert("Event is already linked!");
                        }
                      } else {
                        alert("Please select a database event.");
                      }
                    }}
                    className="px-3 bg-brand-blue text-paper font-mono text-[9px] font-black uppercase tracking-wider hover:bg-ink cursor-pointer border border-ink"
                  >
                    Link Event
                  </button>
                </div>
              </div>

              {/* External */}
              <div className="border border-ink/45 bg-white p-3.5 space-y-3">
                <span className="block font-mono text-[9px] uppercase font-bold text-brand-orange">
                  Add Outside independent Event (Manual details)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Event Name"
                    value={manEventName}
                    onChange={(e) => setManEventName(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Dates"
                    value={manEventDates}
                    onChange={(e) => setManEventDates(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Venue"
                    value={manEventVenue}
                    onChange={(e) => setManEventVenue(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Reference URL"
                    value={manEventLink}
                    onChange={(e) => setManEventLink(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Role (Organiser, Presenter etc)"
                    value={manEventRole}
                    onChange={(e) => setManEventRole(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono col-span-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (manEventName.trim()) {
                      setEditManualEvents([
                        ...editManualEvents,
                        {
                          isInternal: false,
                          name: manEventName.trim(),
                          dates: manEventDates || "Assorted Dates",
                          venue: manEventVenue || "Standard Venue",
                          link: manEventLink.trim() || undefined,
                          role: manEventRole.trim() || "Participant",
                        },
                      ]);
                      setManEventName("");
                      setManEventDates("");
                      setManEventVenue("");
                      setManEventLink("");
                      setManEventRole("Presenter");
                    } else {
                      alert("Please provide the event name.");
                    }
                  }}
                  className="w-full py-2 bg-ink text-paper font-mono text-[10px] font-black uppercase hover:bg-brand-acid hover:text-ink cursor-pointer"
                >
                  Record External Event
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-ink bg-white p-2">
              <span className="block font-mono text-[9px] uppercase font-bold text-ink/50 select-none">Current event listings:</span>
              {editManualEvents.map((e, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 border-b border-ink/10 last:border-0 bg-paper/5 text-xs">
                  <div>
                    <span className="font-mono text-[8px] font-bold text-brand-blue uppercase">[{e.role}] </span>
                    <span className="font-serif font-black">{e.name}</span>
                    <p className="font-mono text-[9px] text-ink/50">{e.dates} ({e.venue})</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditManualEvents(editManualEvents.filter((_, i) => i !== idx))}
                    className="text-brand-orange font-mono font-bold text-[10px] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Requirement 4 Section */}
          <div className="border border-ink p-4 space-y-4 bg-paper/5">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
              Requirement 4: Academic Courses (Instructor / TA listings)
            </span>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Internal */}
              <div className="border border-ink/45 bg-white p-3.5 space-y-3">
                <span className="block font-mono text-[9px] uppercase font-bold text-brand-blue">
                  Link CoDIN Academy internal course
                </span>
                <select
                  value={selectedDbCourseSlug}
                  onChange={(e) => setSelectedDbCourseSlug(e.target.value)}
                  className="w-full p-2 border border-ink font-mono text-xs uppercase bg-white"
                >
                  <option value="">-- Choose LMS course in DB --</option>
                  {allDbCourses.map((crs) => (
                    <option key={crs.slug} value={crs.slug}>
                      {crs.title} ({crs.courseCode || "LMS"})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Role (e.g. Creator, Instructor, TA)"
                    value={selectedDbCourseRole}
                    onChange={(e) => setSelectedDbCourseRole(e.target.value)}
                    className="p-2 border border-ink font-mono text-xs flex-grow font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const matched = allDbCourses.find((c) => c.slug === selectedDbCourseSlug);
                      if (matched) {
                        const verified = editManualCourses.some(
                          (m) => m.isInternal && m.courseSlug === selectedDbCourseSlug
                        );
                        if (!verified) {
                          setEditManualCourses([
                            ...editManualCourses,
                            {
                              isInternal: true,
                              courseSlug: matched.slug,
                              name: matched.title,
                              dates: matched.duration || "Active Session",
                              venue: "CoDIN LMS Academy",
                              link: `/academy/courses/${matched.slug}`,
                              role: selectedDbCourseRole || "Instructor",
                              description: matched.description,
                            },
                          ]);
                          setSelectedDbCourseSlug("");
                        } else {
                          alert("LMS Course is already linked!");
                        }
                      } else {
                        alert("Please select a database course.");
                      }
                    }}
                    className="px-3 bg-brand-blue text-paper font-mono text-[9px] font-black uppercase tracking-wider hover:bg-ink cursor-pointer border border-ink"
                  >
                    Link Course
                  </button>
                </div>
              </div>

              {/* External */}
              <div className="border border-ink/45 bg-white p-3.5 space-y-3">
                <span className="block font-mono text-[9px] uppercase font-bold text-brand-orange">
                  Add Outside independent lecture course
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Course Title"
                    value={manCourseName}
                    onChange={(e) => setManCourseName(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Dates / Semester"
                    value={manCourseDates}
                    onChange={(e) => setManCourseDates(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Institution"
                    value={manCourseVenue}
                    onChange={(e) => setManCourseVenue(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Syllabus URL Link"
                    value={manCourseLink}
                    onChange={(e) => setManCourseLink(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono col-span-2"
                  />
                  <input
                    type="text"
                    placeholder="Capacity / Role"
                    value={manCourseRole}
                    onChange={(e) => setManCourseRole(e.target.value)}
                    className="p-2 border border-ink text-xs font-mono col-span-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (manCourseName.trim()) {
                      setEditManualCourses([
                        ...editManualCourses,
                        {
                          isInternal: false,
                          name: manCourseName.trim(),
                          dates: manCourseDates || "Academic Semester",
                          venue: manCourseVenue || "External Campus",
                          link: manCourseLink.trim() || undefined,
                          role: manCourseRole.trim() || "Instructor",
                        },
                      ]);
                      setManCourseName("");
                      setManCourseDates("");
                      setManCourseVenue("");
                      setManCourseLink("");
                      setManCourseRole("Instructor");
                    } else {
                      alert("Please provide the course name.");
                    }
                  }}
                  className="w-full py-2 bg-ink text-paper font-mono text-[10px] font-black uppercase hover:bg-brand-acid hover:text-ink cursor-pointer"
                >
                  Record External Course
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-ink bg-white p-2">
              <span className="block font-mono text-[9px] uppercase font-bold text-ink/50 select-none">Current academic course listings:</span>
              {editManualCourses.map((c, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 border-b border-ink/10 last:border-0 bg-paper/5 text-xs">
                  <div>
                    <span className="font-mono text-[8px] font-bold text-brand-blue uppercase">[{c.role}] </span>
                    <span className="font-serif font-black">{c.name}</span>
                    <p className="font-mono text-[9px] text-ink/50">{c.dates} - {c.venue}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditManualCourses(editManualCourses.filter((_, i) => i !== idx))}
                    className="text-brand-orange font-mono font-bold text-[10px] hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB PANEL 4: SOCIALS & SCHOLARS */}
      {activeEditTab === "scholars" && (
        <div className="space-y-6">
          <div className="border border-ink bg-paper/10 p-5 space-y-4">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-blue">
              Google Scholar Synced indexes overrides
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-mono text-[8px] text-ink/50 mb-1">Citations</label>
                <input
                  type="number"
                  value={editCitations !== undefined ? editCitations : ""}
                  onChange={(e) => setEditCitations(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full p-2 border border-ink bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-mono text-[8px] text-ink/50 mb-1">h-index</label>
                <input
                  type="number"
                  value={editHIndex !== undefined ? editHIndex : ""}
                  onChange={(e) => setEditHIndex(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full p-2 border border-ink bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-mono text-[8px] text-ink/50 mb-1">i10-index</label>
                <input
                  type="number"
                  value={editI10Index !== undefined ? editI10Index : ""}
                  onChange={(e) => setEditI10Index(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full p-2 border border-ink bg-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-mono text-[8px] text-ink/50 mb-1">Publications</label>
                <input
                  type="number"
                  value={editPublicationCount !== undefined ? editPublicationCount : ""}
                  onChange={(e) => setEditPublicationCount(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full p-2 border border-ink bg-white font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 p-5 border border-ink bg-paper/5">
            <div className="space-y-4">
              <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
                Hyperlinks social portfolios
              </span>
              <div className="space-y-3">
                <div>
                  <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={editLinkedin}
                    onChange={(e) => setEditLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full p-2 border border-ink font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">Personal Website URL</label>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="https://myscholarsite.org"
                    className="w-full p-2 border border-ink font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">Academia.edu URL</label>
                  <input
                    type="text"
                    value={editAcademia}
                    onChange={(e) => setEditAcademia(e.target.value)}
                    placeholder="https://uni.academia.edu/name"
                    className="w-full p-2 border border-ink font-mono text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">ResearchGate URL</label>
                  <input
                    type="text"
                    value={editResearchGate}
                    onChange={(e) => setEditResearchGate(e.target.value)}
                    placeholder="https://researchgate.net/profile/name"
                    className="w-full p-2 border border-ink font-mono text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
                Academic citation profiles overrides
              </span>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">Google Scholar profiles Link</label>
                    <input
                      type="text"
                      value={editRealGoogleScholar}
                      onChange={(e) => setEditRealGoogleScholar(e.target.value)}
                      placeholder="https://scholar.google.com/citations?user=..."
                      className="w-full p-2 border border-ink font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">Citations count</label>
                    <input
                      type="number"
                      value={editGoogleScholarCitations !== undefined ? editGoogleScholarCitations : ""}
                      onChange={(e) => setEditGoogleScholarCitations(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full p-2 border border-ink font-mono text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">Semantic Scholar ID</label>
                    <input
                      type="text"
                      value={editSemanticScholar}
                      onChange={(e) => setEditSemanticScholar(e.target.value)}
                      placeholder="e.g. 172942"
                      className="w-full p-2 border border-ink font-mono text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">SS Citations count</label>
                    <input
                      type="number"
                      value={editSemanticScholarCitations !== undefined ? editSemanticScholarCitations : ""}
                      onChange={(e) => setEditSemanticScholarCitations(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full p-2 border border-ink font-mono text-xs bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[8.5px] uppercase font-bold text-ink/65 mb-1">ORCID ID Registry</label>
                  <input
                    type="text"
                    value={editOrcid}
                    onChange={(e) => setEditOrcid(e.target.value)}
                    placeholder="0000-0002-1825-0097"
                    className="w-full p-2 border border-ink font-mono text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-ink p-5 bg-paper/10 space-y-4">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-orange">
              Other Custom hyperlinks (Label &amp; Target Link)
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name, e.g. Resume"
                value={newLinkName}
                onChange={(e) => setNewLinkName(e.target.value)}
                className="p-2 border border-ink text-xs font-mono bg-white"
              />
              <input
                type="text"
                placeholder="https://drive.google.com/..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="p-2 border border-ink text-xs font-mono flex-grow bg-white"
              />
              <button
                type="button"
                onClick={handleAddCustomLink}
                className="px-4 bg-ink text-paper font-mono text-[10px] font-black uppercase hover:bg-brand-acid hover:text-ink cursor-pointer"
              >
                Insert Link
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editOtherLinks.map((ol, idx) => (
                <span key={idx} className="p-1 px-2 border border-ink bg-white font-mono text-[10px] flex items-center gap-2">
                  {ol.label}: <a href={ol.url} target="_blank" rel="noreferrer" className="text-brand-blue underline">{ol.url}</a>
                  <button type="button" onClick={() => setEditOtherLinks(editOtherLinks.filter((_, i) => i !== idx))} className="text-brand-orange font-bold font-mono">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Academic Papers */}
          <div className="pt-5 border-t border-ink/10">
            <span className="block font-mono text-[10px] uppercase font-black text-brand-orange mb-1.5">
              Refined Peer-Reviewed journals &amp; bibliography (Add article titles line by line)
            </span>
            <textarea
              rows={4}
              value={editPublicationsText}
              onChange={(e) => setEditPublicationsText(e.target.value)}
              placeholder="Structure Mapping on endangered languages preservation indexing (2025)&#10;Phonological modeling on dialects (2024)"
              className="w-full p-3 border border-ink bg-paper/20 font-serif text-xs leading-relaxed focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="pt-5 border-t border-ink/10 flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={handleSave}
            disabled={uploadingCovers || isUploadingCloudinary}
          className="h-14 px-8 bg-brand-blue text-paper border border-ink font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-ink transition-colors cursor-pointer shadow-[5px_5px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[5px] hover:translate-y-[5px]"
        >
          <Save className="w-4 h-4" /> Save overrides and build directory
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-14 px-6 border border-ink text-ink font-mono text-xs font-black uppercase tracking-widest hover:bg-ink/5 transition-colors cursor-pointer"
        >
          Cancel and discard changes
        </button>
      </div>
    </div>
  );
}
