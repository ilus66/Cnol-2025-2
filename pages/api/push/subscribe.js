import { supabase } from "../../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const { user_id, endpoint, p256dh, auth } = req.body;
  
  if (!user_id || !endpoint || !p256dh || !auth) {
    return res.status(400).json({ 
      message: "Paramètres manquants: user_id, endpoint, p256dh, auth requis" 
    });
  }

  try {
    // Vérifier si l'abonnement existe déjà
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .eq("endpoint", endpoint)
      .single();

    if (existing) {
      // Mettre à jour l'abonnement existant
      const { error: updateError } = await supabase
        .from("push_subscriptions")
        .update({ p256dh, auth, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Erreur mise à jour abonnement:", updateError);
        return res.status(500).json({ message: "Erreur lors de la mise à jour de l'abonnement" });
      }

      return res.status(200).json({ 
        message: "Abonnement push mis à jour avec succès",
        type: "updated"
      });
    } else {
      // Créer un nouvel abonnement
      const { error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          user_id,
          endpoint,
          p256dh,
          auth,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Erreur création abonnement:", insertError);
        return res.status(500).json({ message: "Erreur lors de la création de l'abonnement" });
      }

      return res.status(201).json({ 
        message: "Abonnement push créé avec succès",
        type: "created"
      });
    }
  } catch (error) {
    console.error("Erreur API push subscribe:", error);
    return res.status(500).json({ message: "Erreur serveur interne" });
  }
}
