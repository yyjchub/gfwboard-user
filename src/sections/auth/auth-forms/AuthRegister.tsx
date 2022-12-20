import React, { useEffect, useState, SyntheticEvent, useMemo } from "react";
import lo from "lodash-es";
import { Link as RouterLink, useNavigate } from "react-router-dom";

// material-ui
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormHelperText,
  Grid,
  Link,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Stack,
  Typography,
  FormControlLabel,
  Radio,
  Checkbox
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

// third party
import * as Yup from "yup";
import { Formik } from "formik";
import { Trans, useTranslation } from "react-i18next";
import OtpInput from "react18-input-otp";

// project import
import useScriptRef from "@/hooks/useScriptRef";
import IconButton from "@/components/@extended/IconButton";
import AnimateButton from "@/components/@extended/AnimateButton";
import { useGetGuestConfigQuery, useRegisterMutation, useSendEmailVerifyMutation } from "@/store/services/api";
import { strengthColor, strengthIndicator } from "@/utils/password-strength";

// types
import { StringColorProps } from "@/types/password";
import { RegisterPayload } from "@/model/register";

// assets
import { EyeOutlined, EyeInvisibleOutlined, SendOutlined } from "@ant-design/icons";
import { useSnackbar } from "notistack";

// ============================|| FIREBASE - REGISTER ||============================ //

const AuthRegister = () => {
  const theme = useTheme();
  const scriptedRef = useScriptRef();
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { enqueueSnackbar } = useSnackbar();

  const [register] = useRegisterMutation();
  const [sendEmailCode] = useSendEmailVerifyMutation();
  const { data: siteConfig } = useGetGuestConfigQuery();

  const [level, setLevel] = useState<StringColorProps>();
  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event: SyntheticEvent) => {
    event.preventDefault();
  };

  const handlePasswordChange = (value: string) => {
    const temp = strengthIndicator(value);
    setLevel(strengthColor(temp));
  };

  const handleSendEmailCode = (email: string) => () => {
    console.log(`send email code to ${email}`);
    sendEmailCode(email)
      .unwrap()
      .then((res) => {
        console.log(res);
        enqueueSnackbar(t("notice::send_email_code_success"), { variant: "success" });
      })
      .catch((err) => {
        console.error("send email code error", err);
        enqueueSnackbar(t("notice::send_email_code_fail"), { variant: "error" });
      });
  };

  useEffect(() => {
    handlePasswordChange("");
  }, []);

  const validationSchema = useMemo(() => {
    const invite_code = siteConfig?.is_invite_force
      ? Yup.string()
          .max(8, t("register.invite_code_max").toString())
          .required(t("register.invite_code_required").toString())
      : Yup.string().max(8, t("register.invite_code_max").toString());
    const email_code = siteConfig?.is_email_verify
      ? Yup.number()
          .max(6, t("register.email_code_max").toString())
          .required(t("register.email_code_required").toString())
      : Yup.number().negative();

    return Yup.object().shape({
      email: Yup.string()
        .email(t("register.email_invalid").toString())
        .max(255, t("register.email_max").toString())
        .required(t("register.email_required").toString()),
      password: Yup.string()
        .max(255, t("register.password_max").toString())
        .required(t("register.password_required").toString()),
      invite_code: invite_code,
      email_code: email_code
    });
  }, [t, siteConfig?.is_invite_force]);

  return (
    <>
      <Formik
        initialValues={{
          email: "",
          password: "",
          invite_code: "",
          email_code: "",
          agree: false,
          submit: null
        }}
        validationSchema={validationSchema}
        onSubmit={async (values, { setErrors, setStatus, setSubmitting }) => {
          if (!values.agree) {
            setStatus({ success: false });
            setErrors({ submit: t("register.agree_required").toString() });
            setSubmitting(false);
            return;
          }

          try {
            await register({
              email: values.email,
              password: values.password,
              invite_code: values.invite_code,
              email_code: siteConfig?.is_email_verify ? values.email_code : ""
            } as RegisterPayload)
              .unwrap()
              .then(
                () => {
                  setStatus({ success: true });
                  enqueueSnackbar(t("notice::register_success"), { variant: "success" });
                  navigate("/dashboard", { replace: true });
                },
                (error) => {
                  setStatus({ success: false });
                  setErrors({ submit: error.message });
                }
              );
          } catch (err: any) {
            console.error(err);
            if (scriptedRef.current) {
              setStatus({ success: false });
              setErrors({ submit: err.message });
              setSubmitting(false);
            }
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ errors, handleBlur, handleChange, handleSubmit, isSubmitting, touched, values, setValues }) => (
          <Box component={"form"} onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Email */}
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="email">
                    <Trans>{"register.email"}</Trans>
                  </InputLabel>
                  <OutlinedInput
                    fullWidth
                    error={Boolean(touched.email && errors.email)}
                    id="email"
                    type="email"
                    value={values.email}
                    name="email"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    placeholder="user@example.com"
                    inputProps={{}}
                    endAdornment={
                      siteConfig?.is_email_verify === 1 ? (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="send email code"
                            onClick={handleSendEmailCode(values.email)}
                            edge="end"
                            color="secondary"
                          >
                            <SendOutlined />
                          </IconButton>
                        </InputAdornment>
                      ) : undefined
                    }
                  />
                  {touched.email && errors.email && (
                    <FormHelperText error id="helper-text-email-signup">
                      {errors.email}
                    </FormHelperText>
                  )}
                </Stack>
              </Grid>
              {siteConfig?.is_email_verify === 1 && (
                <>
                  {/* Email Code */}
                  <Grid item xs={12}>
                    <Stack spacing={1}>
                      <InputLabel htmlFor="email-code-signup">
                        <Trans>{"register.email_code"}</Trans>
                      </InputLabel>
                      <OtpInput
                        value={values.email_code}
                        onChange={(otp: string) => {
                          setValues((prev) => ({
                            ...prev,
                            email_code: otp
                          }));
                        }}
                        numInputs={6}
                        containerStyle={{ justifyContent: "space-between" }}
                        inputStyle={{
                          width: "100%",
                          margin: "8px",
                          padding: "10px",
                          border: `1px solid ${
                            theme.palette.mode === "dark" ? theme.palette.grey[200] : theme.palette.grey[300]
                          }`,
                          borderRadius: 4,
                          ":hover": {
                            borderColor: theme.palette.primary.main
                          }
                        }}
                        focusStyle={{
                          outline: "none",
                          boxShadow: theme.customShadows.primary,
                          border: `1px solid ${theme.palette.primary.main}`
                        }}
                      />
                      {touched.email_code && errors.email_code && (
                        <FormHelperText error id="helper-text-email-signup">
                          {errors.email_code}
                        </FormHelperText>
                      )}
                    </Stack>
                  </Grid>
                </>
              )}
              {/* Password */}
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="password-signup">
                    <Trans>{"register.password"}</Trans>
                  </InputLabel>
                  <OutlinedInput
                    fullWidth
                    error={Boolean(touched.password && errors.password)}
                    id="password-signup"
                    type={showPassword ? "text" : "password"}
                    value={values.password}
                    name="password"
                    onBlur={handleBlur}
                    onChange={(e) => {
                      handleChange(e);
                      handlePasswordChange(e.target.value);
                    }}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                          color="secondary"
                        >
                          {showPassword ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        </IconButton>
                      </InputAdornment>
                    }
                    placeholder="******"
                    inputProps={{}}
                  />
                  {touched.password && errors.password && (
                    <FormHelperText error id="helper-text-password-signup">
                      {errors.password}
                    </FormHelperText>
                  )}
                </Stack>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item>
                      <Box sx={{ bgcolor: level?.color, width: 85, height: 8, borderRadius: "7px" }} />
                    </Grid>
                    <Grid item>
                      <Typography variant="subtitle1" fontSize="0.75rem">
                        {t("register.password_strength", {
                          context: lo.lowerCase(level?.label)
                        }).toString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </FormControl>
              </Grid>
              {/* Invite Code */}
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="invite-code-signup" required={siteConfig?.is_invite_force === 1}>
                    <Trans>{"register.invite_code"}</Trans>
                  </InputLabel>
                  <OutlinedInput
                    fullWidth
                    error={Boolean(touched.invite_code && errors.invite_code)}
                    id="invite-code-signup"
                    type="text"
                    value={values.invite_code}
                    name="invite_code"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    required={siteConfig?.is_invite_force === 1}
                    placeholder={t("register.invite_code_placeholder", {
                      context: siteConfig?.is_invite_force === 1 ? "required" : "optional"
                    }).toString()}
                    inputProps={{}}
                  />
                  {touched.invite_code && errors.invite_code && (
                    <FormHelperText error id="helper-text-email-signup">
                      {errors.invite_code}
                    </FormHelperText>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  value={false}
                  control={<Checkbox />}
                  name={"agree"}
                  id={"agree"}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  aria-required={true}
                  label={
                    <Typography variant={"body2"} noWrap>
                      <Trans i18nKey={"register.license_agree"}>
                        <Link
                          id={"terms-of-service"}
                          variant="subtitle2"
                          component={RouterLink}
                          to="/terms-of-service"
                        />
                        <Link id={"privacy-policy"} variant="subtitle2" component={RouterLink} to="/privacy-policy" />
                      </Trans>
                    </Typography>
                  }
                />
              </Grid>
              {errors.submit && (
                <Grid item xs={12}>
                  <FormHelperText error>{errors.submit}</FormHelperText>
                </Grid>
              )}
              <Grid item xs={12}>
                <AnimateButton>
                  <Button
                    disableElevation
                    disabled={isSubmitting}
                    fullWidth
                    size="large"
                    type="submit"
                    variant="contained"
                    color="primary"
                  >
                    Create Account
                  </Button>
                </AnimateButton>
              </Grid>
            </Grid>
          </Box>
        )}
      </Formik>
    </>
  );
};

export default AuthRegister;
