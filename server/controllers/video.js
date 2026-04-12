import Video from "../Modals/video.js";   // ✅ Capitalized convention

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please upload an mp4 video file only",
    });
  }

  try {
    const file = new Video({
      videotitle: req.body.videotitle,
      filename: req.file.filename,        // ✅ IMPORTANT FIX
      filepath: req.file.path.replace(/\\/g, "/"),
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      uploader: req.body.uploader || "anonymous",
    });

    await file.save();

    console.log("VIDEO SAVED:", file);    // ✅ DEBUG LINE

    return res.status(201).json({
      message: "File uploaded successfully",
      video: file,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await Video.find();
    console.log("VIDEOS FROM DB:", files);
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};