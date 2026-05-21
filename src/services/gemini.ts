/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import axios from "axios";

export async function generateBossImage(inputs: {
  articleTitle: string;
  materialColor: string;
  overlayText: string;
  aspectRatio: string;
}) {
  try {
    const response = await axios.post("/api/gemini/generate", inputs);
    return response.data;
  } catch (error: any) {
    console.error("Error calling server generating image:", error);
    const serverMessage = error.response?.data?.error || error.message || "Unknown error";
    throw new Error(serverMessage);
  }
}

